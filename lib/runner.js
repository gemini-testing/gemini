'use strict';
var EventEmitter = require('events').EventEmitter,

    _ = require('lodash'),
    q = require('q'),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util'),
    NoRefImageError = require('./errors/no-ref-image-error'),
    StateError = require('./errors/state-error'),

    pool = require('./browser-pool'),
    CaptureSession = require('../lib/capture-session'),
    Coverage = require('./coverage'),
    Stats = require('./stats'),

    RunnerEvents = require('./constants/runner-events');

module.exports = inherit(EventEmitter, {

    __constructor: function(config) {
        this.config = config;
        this._cancelled = false;
        this.browserPool = pool.create(config);
        this.coverage = new Coverage(config);
    },

    setTestBrowsers: function(browsers) {
        this._testBrowsers = browsers;
    },

    /**
     * @param {Suite[]} suites
     * @returns {*}
     */
    run: function(suites) {
        var _this = this;
        this._stats = new Stats();

        return q.fcall(function() {
            _this.emit(RunnerEvents.BEGIN, {
                config: _this.config,
                totalStates: _.reduce(suites, function(result, suite) {
                    return result + suite.states.length;
                }, 0),
                browserIds: Object.keys(_this.config.browsers)
            });
        }).then(function() {
            return _this._prepare();
        })
        .then(function() {
            return _this._runBrowsers(suites);
        })
        .then(function() {
            if (_this.config.coverage) {
                return _this.coverage.processStats();
            }
        })
        .then(function() {
            _this.emit(RunnerEvents.END);
            return _this._stats.data;
        });
    },

    _prepare: function() {
    },

    _runBrowsers: function(suites) {
        var _this = this;
        return q.all(this._getBrowsersToLaunch().map(function(browserId) {
            _this.emit(RunnerEvents.START_BROWSER, {browserId: browserId});
            return _this._runSuitesInBrowser(suites, browserId)
                .then(function() {
                    return _this.browserPool.finalizeBrowsers(browserId);
                })
                .fail(function(e) {
                    _this._cancelled = true;
                    return q.reject(e);
                })
                .fin(function() {
                    _this.emit(RunnerEvents.STOP_BROWSER, {browserId: browserId});
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

    _runSuitesInBrowser: function(suites, browserId) {
        var _this = this;
        return promiseUtils.seqMap(suites, function(suite) {
            return _this._runSuiteInBrowser(suite, browserId);
        });
    },

    _runSuiteInBrowser: function(suite, browserId) {
        if (this._cancelled) {
            return q.resolve();
        }

        var _this = this,
            eventData = {
                suite: suite,
                browserId: browserId,

                // Deprecated fileds. TODO: remove before next release
                suiteName: suite.name,
                suitePath: suite.path,
                suiteId: suite.id
            };

        this.emit(RunnerEvents.BEGIN_SUITE, eventData);

        return this._runSuiteStates(suite, browserId)
            .then(function() {
                _this.emit(RunnerEvents.END_SUITE, eventData);
            });
    },

    _runSuiteStates: function(suite, browserId) {
        if (!suite.hasStates) {
            return q.resolve();
        }

        var _this = this;
        return this.browserPool.getBrowser(browserId)
            .then(function(browser) {
                var session = new CaptureSession(browser);
                return browser.open(_this.config.getAbsoluteUrl(suite.url))
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
                    })
                    .fin(function() {
                        return _this.browserPool.freeBrowser(browser);
                    });
            });
    },

    _runStateInSession: function(state, session) {
        if (this._cancelled) {
            return q.resolve();
        }
        var _this = this,
            suite = state.suite,
            eventData = {
                suite: suite,
                state: state,
                browserId: session.browser.id,

                //Deprectaed fields. TODO: Remove in before next release
                suiteName: state.suite.name,
                suitePath: state.suite.path,
                suiteId: state.suite.id,
                stateName: state.name
            };

        _this._stats.add('total');
        if (state.shouldSkip(session.browser)) {
            _this.emit(RunnerEvents.SKIP_STATE, eventData);
            this._stats.add('skipped');
            return q();
        }

        _this.emit(RunnerEvents.BEGIN_STATE, eventData);

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
                        _this.emit(RunnerEvents.WARNING, e);
                        _this._stats.add('warned');
                    } else {
                        _this.emit(RunnerEvents.ERROR, e);
                        _this._stats.add('errored');
                    }
                } else if (e instanceof StateError) {
                    e.suite = suite;
                    e.state = state;
                    e.browserId = session.browserId;

                    //Deprectaed fields. TODO: remove before next release
                    e.suiteId = state.suite.id;
                    e.suiteName = state.suite.name;
                    e.stateName = state.name;
                    e.suitePath = state.suite.path;

                    _this._stats.add('errored');
                    _this.emit(RunnerEvents.ERROR, e);
                } else {
                    return q.reject(e);
                }
            })
            .fin(function() {
                _this.emit(RunnerEvents.END_STATE, eventData);
            });
    },

    _processCapture: function() {
    }

});
