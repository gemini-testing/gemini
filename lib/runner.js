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

    RunnerEvents = require('./constants/runner-events'),
    log = require('debug')('gemini:runner');

function myAll(promises) {
    log('wait for settled');
    return q.allSettled(promises)
        .then(function(results) {
            log('all settled');
            var rejected = _.find(results, {state: 'rejected'});
            if (rejected) {
                log('rejected', rejected.reason);
                return q.reject(rejected.reason);
            }
            log('no one rejected %o', results);
        });
}

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

        return q.fcall(function() {
            _this.emit(RunnerEvents.BEGIN, {
                config: _this.config,
                totalStates: _.reduce(suites, function(result, suite) {
                    return result + suite.states.length;
                }, 0),
                browserIds: _this.config.getBrowserIds()
            });
        }).then(function() {
            return _this._prepare();
        })
        .then(function() {
            return _this._runBrowsers(suites);
        })
        .then(function() {
            if (_this.config.coverageEnabled) {
                return _this.coverage.processStats();
            }
        })
        .fin(function() {
            _this.emit(RunnerEvents.END);
        });
    },

    _prepare: function() {
    },

    _runBrowsers: function(suites) {
        var _this = this;
        return myAll(this._getBrowsersToLaunch().map(function(browserId) {
            log('start browser %s', browserId);
            _this.emit(RunnerEvents.START_BROWSER, {browserId: browserId});
            return _this._runSuitesInBrowser(suites, browserId)
                .fin(function() {
                    return _this.browserPool.finalizeBrowsers(browserId)
                        .then(function() {
                            log('finalized %s', browserId);
                            _this.emit(RunnerEvents.STOP_BROWSER, {browserId: browserId});
                        });
                });
        }));
    },

    _getBrowsersToLaunch: function() {
        var ids = this.config.getBrowserIds();
        if (this._testBrowsers) {
            return ids.filter(function(browserId) {
                return this._testBrowsers.indexOf(browserId) !== -1;
            }, this);
        }
        return ids;
    },

    _runSuitesInBrowser: function(suites, browserId) {
        var _this = this;
        var p = suites.map(function(suite) {
                return _this.browserPool.getBrowser(browserId)
                    .then(function(browser) {
                        return _this._runSuiteInBrowser(suite, browser)
                            .fin(function() {
                                return _this.browserPool.freeBrowser(browser);
                            });
                    })
                    .fail(function(e) {
                        log('critical error %o in %s', e, browserId);
                        if (!(e instanceof pool.CancelledError)) {
                            _this._cancel();
                            log('cancelled all');
                            return q.reject(e).fail(function(e) {
                                log('fail %o', e);
                                return q.reject(e);
                            });
                        }
                        return 'cancel';
                    });
            });

        return myAll(p);
    },

    _cancel: function() {
        this._cancelled = true;
        this.browserPool.cancel();
    },

    _runSuiteInBrowser: function(suite, browser) {
        if (this._cancelled) {
            return q.resolve();
        }

        var _this = this,
            eventData = {
                suite: suite,
                browserId: browser.id
            };

        this.emit(RunnerEvents.BEGIN_SUITE, eventData);

        return this._runSuiteStates(suite, browser)
            .fin(function() {
                _this.emit(RunnerEvents.END_SUITE, eventData);
            });
    },

    _runSuiteStates: function(suite, browser) {
        if (!suite.hasStates) {
            return q.resolve();
        }

        var _this = this,
            session = new CaptureSession(browser);
        return browser.openRelative(suite.url)
            .then(function() {
                return session.runHook(suite.beforeHook, suite);
            })
            .then(function() {
                return promiseUtils.seqMap(suite.states, function(state) {
                    return _this._runStateInSession(state, session);
                });
            })
            .then(function() {
                return session.runHook(suite.afterHook, suite);
            })
            .then(function() {
                return suite.runPostActions();
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
                browserId: session.browser.id
            };

        if (state.shouldSkip(session.browser)) {
            _this.emit(RunnerEvents.SKIP_STATE, eventData);
            return q();
        }

        _this.emit(RunnerEvents.BEGIN_STATE, eventData);

        return session.capture(state, {coverage: this.config.coverageEnabled})
            .then(function(data) {
                if (_this.config.coverageEnabled) {
                    _this.coverage.addStatsForBrowser(data.coverage, session.browser);
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
                    } else {
                        _this.emit(RunnerEvents.ERROR, e);
                    }
                } else if (e instanceof StateError) {
                    e.suite = suite;
                    e.state = state;
                    e.browserId = session.browserId;

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
