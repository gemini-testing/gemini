'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    Runner = require('./runner'),
    SuiteRunner = require('./suite-runner'),

    promiseUtils = require('../promise-util'),
    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events'),
    pool = require('../browser-pool'),
    MetaError = require('../errors/meta-error'),

    log = require('debug')('gemini:runner');

var BrowserRunner = inherit(Runner, {
    __constructor: function(browserId, config, browserPool) {
        this._browserId = browserId;
        this._config = config;
        this._browserPool = browserPool;
        this._suiteRunners = [];
    },

    run: function(suites) {
        var _this = this;
        log('start browser %s', this._browserId);
        this.emit(RunnerEvents.START_BROWSER, {browserId: this._browserId});
        return this._runSuites(suites)
            .fin(function() {
                return _this._browserPool.finalizeBrowsers(_this._browserId)
                    .fail(function(e) {
                        if (e instanceof MetaError) {
                            console.warn(e.message);
                        } else {
                            return q.reject(e);
                        }
                    })
                    .then(function() {
                        log('stop browser %s', _this._browserId);
                        _this.emit(RunnerEvents.STOP_BROWSER, {browserId: _this._browserId});
                    });
            });
    },

    cancel: function() {
        this._runSuite = this._doNothing;
        this._suiteRunners.forEach(function(runner) {
            runner.cancel();
        });
    },

    _doNothing: function() {
        return q.resolve();
    },

    _runSuites: function(suites) {
        var _this = this,
            retryCount = this._config.forBrowser(this._browserId).retry;

        return _(suites)
            .filter(function(suite) {
                return _.contains(suite.browsers, _this._browserId);
            })
            .map(function(suite) {
                return _this._tryToRunSuite(suite, retryCount);
            })
            .thru(promiseUtils.waitForResults)
            .value();
    },

    _tryToRunSuite: function(suite, retryCount) {
        var _this = this;

        return _this._browserPool.getBrowser(this._browserId)
            .then(function(browser) {
                return _this._runSuite(suite, browser)
                    .fin(function() {
                        return _this._browserPool.freeBrowser(browser);
                    });
            })
            .fail(function(e) {
                if (e instanceof pool.CancelledError) {
                    log('critical error %o in %s', e, _this._browserId);
                    return;
                }

                if (retryCount === 0) {
                    return q.reject(_.extend(e, {
                        browserId: _this._browserId
                    }));
                }

                var eventData =  {
                    message: [
                        'Restarting ' + suite.name,
                        'Suite path: ' + suite.path,
                        'Retries left: ' + --retryCount,
                        'Error message: ' + e.message
                    ].join('\n')
                };

                _this.emit(RunnerEvents.INFO, eventData);

                return _this._tryToRunSuite(suite, retryCount);
            });
    },

    _runSuite: function(suite, browser) {
        var runner = SuiteRunner.create(browser, this._config);

        this.passthroughEvent(runner, [
            RunnerEvents.BEGIN_SUITE,
            RunnerEvents.END_SUITE,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CAPTURE_DATA
        ]);

        this._suiteRunners.push(runner);
        return runner.run(suite);
    }
}, {
    create: function(browserId, config, browserPool) {
        return new BrowserRunner(browserId, config, browserPool);
    }
});

module.exports = BrowserRunner;
