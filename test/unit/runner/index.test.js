'use strict';
var Runner = require('../../../lib/runner'),
    TestSessionRunner = require('../../../lib/runner/test-session-runner'),
    Config = require('../../../lib/config');

describe('runner', function() {
    var sandbox = sinon.sandbox.create(),
        runner;

    function run_(suites) {
        return runner.run(suites || []);
    }

    beforeEach(function() {
        sandbox.stub(TestSessionRunner, 'create');
        TestSessionRunner.create.returns(sinon.createStubInstance(TestSessionRunner));

        runner = new Runner(sinon.createStubInstance(Config));
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('run', function() {
        it('should emit `begin` event when tests start', function() {
            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);
            return run_().then(function() {
                assert.calledOnce(onBegin);
            });
        });

        it('should pass total number of states when emitting `begin`', function() {
            var suites = [
                {states: []},
                {states: [1, 2]},
                {states: [3]}
            ];

            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_(suites).then(function() {
                assert.calledWith(onBegin, sinon.match({totalStates: 3}));
            });
        });

        it('should pass all browser ids when emitting `begin`', function() {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);

            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(function() {
                assert.calledWith(onBegin, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `begin`', function() {
            var onBegin = sandbox.spy().named('onBegin');
            runner.on('begin', onBegin);

            return run_().then(function() {
                assert.calledWith(onBegin, sinon.match({
                    config: runner.config
                }));
            });
        });

        it('should launch only browsers specified in testBrowsers', function() {
            runner.config.getBrowserIds
                .returns(['browser1', 'browser2']);
            runner.setTestBrowsers(['browser1']);

            return run_().then(function() {
                assert.calledWith(TestSessionRunner.create, sinon.match.any, ['browser1']);
            });
        });

        it('should emit `end`', function() {
            var onEnd = sandbox.spy();
            runner.on('end', onEnd);

            return run_().then(function() {
                assert.calledOnce(onEnd);
            });
        });

        it('should emit events in correct order', function() {
            var begin = sandbox.spy().named('onBegin'),
                end = sandbox.spy().named('onEnd');

            runner.on('begin', begin);
            runner.on('end', end);

            return run_().then(function() {
                assert.callOrder(begin, end);
            });
        });
    });
});
