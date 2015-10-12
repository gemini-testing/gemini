'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    q = require('q'),
    Runner = require('./runner'),
    BrowserRunner = require('./browser-runner'),

    promiseUtils = require('../promise-util'),
    RunnerEvents = require('../constants/runner-events'),
    PrivateEvents = require('./private-events'),
    pool = require('../browser-pool'),
    SuiteMonitor = require('../suite-monitor');

var TestSessionRunner = inherit(Runner, {
    __constructor: function(config, testBrowsers) {
        this.browserPool = pool.create(config);

        this.monitor = new SuiteMonitor(this);
        this.passthroughEvent(this.monitor, RunnerEvents.END_SUITE);

        var allBrowsers = config.getBrowserIds(),
            browsersToRun = testBrowsers? _.intersection(testBrowsers, allBrowsers) : allBrowsers;

        this._browserRunners = browsersToRun.map(function(browserId) {
            return this._initBrowserRunner(browserId, config);
        }, this);
    },

    _initBrowserRunner: function(browserId, config) {
        var runner = BrowserRunner.create(browserId, config, this.browserPool);
        this.passthroughEvent(runner, [
            RunnerEvents.START_BROWSER,
            RunnerEvents.STOP_BROWSER,
            RunnerEvents.INFO,
            RunnerEvents.SKIP_STATE,
            RunnerEvents.BEGIN_STATE,
            RunnerEvents.END_STATE,
            RunnerEvents.WARNING,
            RunnerEvents.ERROR,
            PrivateEvents.CAPTURE_DATA,
            PrivateEvents.CRITICAL_ERROR
        ]);

        this.passthroughEvent(runner, RunnerEvents.BEGIN_SUITE);
        runner.on(RunnerEvents.END_SUITE, function(data) {
            this.monitor.suiteFinished(data.suite, data.browserId);
        }.bind(this));

        return runner;
    },

    run: function(suites) {
        return _(this._browserRunners)
            .map(this._runBrowserRunner.bind(this, suites))
            .thru(promiseUtils.waitForResults)
            .value();
    },

    _runBrowserRunner: function(suites, runner) {
        return runner.run(suites)
            .fail(function(e) {
                this._cancel();
                return q.reject(e);
            }.bind(this));
    },

    _cancel: function() {
        this._browserRunners.forEach(function(runner) {
            runner.cancel();
        });
        this.browserPool.cancel();
    }
}, {
    create: function(config, testBrowsers) {
        return new TestSessionRunner(config, testBrowsers);
    }
});

module.exports = TestSessionRunner;
