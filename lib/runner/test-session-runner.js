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
        this._passthroughEvent(this.monitor, RunnerEvents.END_SUITE);

        var allBrowsers = config.getBrowserIds(),
            browsersToRun = testBrowsers? _.intersection(testBrowsers, allBrowsers) : allBrowsers;

        this._browserRunners = browsersToRun.map(function(browserId) {
            return this._initBrowserRunner(browserId, config);
        }, this);
    },

    _initBrowserRunner: function(browserId, config) {
        var runner = BrowserRunner.create(browserId, config, this.browserPool);
        this._passthroughEvent(runner, RunnerEvents.START_BROWSER);
        this._passthroughEvent(runner, RunnerEvents.STOP_BROWSER);
        this._passthroughEvent(runner, RunnerEvents.INFO);

        this._passthroughEvent(runner, RunnerEvents.BEGIN_SUITE);
        runner.on(RunnerEvents.END_SUITE, function(data) {
            this.monitor.suiteFinished(data.suite, data.browserId);
        }.bind(this));

        this._passthroughEvent(runner, RunnerEvents.SKIP_STATE);
        this._passthroughEvent(runner, RunnerEvents.BEGIN_STATE);
        this._passthroughEvent(runner, RunnerEvents.END_STATE);
        this._passthroughEvent(runner, RunnerEvents.WARNING);
        this._passthroughEvent(runner, RunnerEvents.ERROR);

        this._passthroughEvent(runner, PrivateEvents.CAPTURE_DATA);

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
