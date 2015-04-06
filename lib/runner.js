'use strict';
var EventEmitter = require('events').EventEmitter,

    q = require('q'),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util'),
    NoRefImageError = require('./errors/no-ref-image-error'),
    StateError = require('./errors/state-error'),

    BrowserLauncher = require('./browser/launcher'),
    CaptureSession = require('../lib/capture-session'),
    Coverage = require('./coverage'),
    Stats = require('./stats');

module.exports = inherit(EventEmitter, {

    __constructor: function(config, browserLauncher) {
        this.config = config;
        this._cancelled = false;
        this.browserLauncher = browserLauncher || new BrowserLauncher(config);
        this.coverage = new Coverage(config);
    },

    setGrepPattern: function(pattern) {
        this._grepPattern = pattern;
    },

    setTestBrowsers: function(browsers) {
        this._testBrowsers = browsers;
    },

    run: function(rootSuite) {
        var _this = this;
        this._stats = new Stats();

        return q.fcall(function() {
            _this.emit('begin', {
                config: _this.config,
                totalStates: rootSuite.deepStatesCount,
                browserIds: Object.keys(_this.config.browsers)
            });
        }).then(function() {
            return _this._prepare();
        })
        .then(function() {
            return _this._runBrowsers(rootSuite.children);
        })
        .then(function() {
            if (_this.config.coverage) {
                return _this.coverage.processStats();
            }
        })
        .then(function() {
            _this.emit('end');
            return _this._stats.data;
        });
    },

    _prepare: function() {
    },

    _runBrowsers: function(suites) {
        var _this = this;
        return q.all(this._getBrowsersToLaunch().map(function(browserId) {
            return _this.browserLauncher.launch(browserId)
                .then(function(browser) {
                    _this.emit('startBrowser', {browserId: browser.id});
                    return _this._runSuitesInBrowser(suites, browser)
                        .fin(function() {
                            _this.emit('stopBrowser', {browserId: browser.id});
                            return _this.browserLauncher.stop(browser);
                        });
                })
                .fail(function(e) {
                    _this._cancelled = true;
                    return q.reject(e);
                });
        }));
    },

    _getBrowsersToLaunch: function() {
        var ids = Object.keys(this.config.browsers);
        if (this._testBrowsers) {
            return ids.filter(function(browserId) {
                return this._testBrowsers.indexOf(browserId) !== -1;
            }, this);
        }
        return ids;
    },

    _runSuitesInBrowser: function(suites, browser) {
        var _this = this;
        return promiseUtils.seqMap(suites, function(suite) {
            return _this._runSuiteInBrowser(suite, browser);
        });
    },

    _runSuiteInBrowser: function(suite, browser) {
        if (this._cancelled) {
            return q.resolve();
        }

        var _this = this,
            eventData = {
                browserId: browser.id,
                suiteName: suite.name,
                suiteId: suite.id
            };

        this.emit('beginSuite', eventData);

        return this._runSuiteStateIfMatches(suite, browser)
            .then(function() {
                return _this._runSuitesInBrowser(suite.children, browser);
            })
            .then(function() {
                _this.emit('endSuite', eventData);
            });
    },

    _runSuiteStateIfMatches: function(suite, browser) {
        if (this._grepPattern && !this._grepPattern.test(suite.fullName)) {
            return q.resolve();
        }

        return this._runSuiteStates(suite, browser);
    },

    _runSuiteStates: function(suite, browser) {
        if (!suite.hasStates) {
            return q.resolve();
        }
        var _this = this,
            session = new CaptureSession(browser);

        return browser.open(this.config.getAbsoluteUrl(suite.url))
            .then(function() {
                return session.runHook(suite.beforeHook);
            })
            .then(function() {
                return promiseUtils.seqMap(suite.states, function(state) {
                    return _this._runStateInSession(state, session);
                });
            })
            .then(function() {
                return session.runHook(suite.afterHook);
            });
    },

    _runStateInSession: function(state, session) {
        if (this._cancelled) {
            return q.resolve();
        }
        var _this = this,
            suite = state.suite,
            eventData = {
                browserId: session.browser.id,
                suiteName: state.suite.name,
                suiteId: state.suite.id,
                stateName: state.name
            };

        _this._stats.add('total');
        if (state.shouldSkip(session.browser)) {
            _this.emit('skipState', eventData);
            this._stats.add('skipped');
            return q();
        }

        _this.emit('beginState', eventData);

        return session.capture(state, {coverage: this.config.coverage})
            .then(function(data) {
                if (_this.config.coverage) {
                    _this.coverage.addStats(data.coverage);
                }
                return q(_this._processCapture({
                    suite: suite,
                    state: state,
                    browser: session.browser,
                    image: data.image,
                    canHaveCaret: data.canHaveCaret
                }));
            })
            .fail(function(e) {
                if (e instanceof NoRefImageError) {
                    if (_this.config.referenceImageAbsence === 'warning') {
                        _this.emit('warning', e);
                        _this._stats.add('warned');
                    } else {
                        _this.emit('error', e);
                        _this._stats.add('errored');
                    }
                } else if (e instanceof StateError) {
                    e.suiteId = state.suite.id;
                    e.suiteName = state.suite.name;
                    e.stateName = state.name;
                    e.browserId = session.browserId;

                    _this._stats.add('errored');
                    _this.emit('error', e);
                } else {
                    return q.reject(e);
                }
            })
            .fin(function() {
                _this.emit('endState', eventData);
            });
    },

    _processCapture: function() {
    }

});
