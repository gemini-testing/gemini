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

    log = require('debug')('gemini:runner');

var BrowserRunner = inherit(Runner, {
    __constructor: function(browserId, config, browserPool) {
        this._browserId = browserId;
        this._config = config;
        this._browserPool = browserPool;
        this._cancelled = false;
        this._suiteRunners = [];
    },

    run: function(suites) {
        var _this = this;
        log('start browser %s', this._browserId);
        this.emit(RunnerEvents.START_BROWSER, {browserId: this._browserId});
        return this._runSuites(suites)
            .fin(function() {
                return _this._browserPool.finalizeBrowsers(_this._browserId)
                    .then(function() {
                        log('stop browser %s', _this._browserId);
                        _this.emit(RunnerEvents.STOP_BROWSER, {browserId: _this._browserId});
                    });
            });
    },

    cancel: function() {
        this._cancelled = true;
        this._suiteRunners.forEach(function(runner) {
            runner.cancel();
        });
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
                if (_this._cancelled) {
                    return;
                }

                var runner = _this._createSuiteRunner(browser);
                return runner.run(suite)
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

    _createSuiteRunner: function(browser) {
        var runner = SuiteRunner.create(browser, this._config);

        this._passthroughEvent(runner, RunnerEvents.BEGIN_SUITE);
        this._passthroughEvent(runner, RunnerEvents.END_SUITE);
        this._passthroughEvent(runner, RunnerEvents.SKIP_STATE);
        this._passthroughEvent(runner, RunnerEvents.BEGIN_STATE);
        this._passthroughEvent(runner, RunnerEvents.END_STATE);
        this._passthroughEvent(runner, RunnerEvents.WARNING);
        this._passthroughEvent(runner, RunnerEvents.ERROR);
        this._passthroughEvent(runner, PrivateEvents.CAPTURE_DATA);

        this._suiteRunners.push(runner);
        return runner;
    }
}, {
    create: function(browserId, config, browserPool) {
        return new BrowserRunner(browserId, config, browserPool);
    }
});

module.exports = BrowserRunner;
