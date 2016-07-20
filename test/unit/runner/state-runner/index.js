'use strict';

var stateRunner = require('lib/runner/state-runner'),
    StateRunner = require('lib/runner/state-runner/state-runner'),
    DisabledStateRunner = require('lib/runner/state-runner/disabled-state-runner'),
    util = require('../../../util');

describe('runner/state-runner', function() {
    var sandbox = sinon.sandbox.create(),
        sessionStub,
        configStub;

    beforeEach(function() {
        sandbox.stub(DisabledStateRunner.prototype, '__constructor');

        sessionStub = {browser: {}};
        configStub = {
            id: 'some-default-id',
            system: 'some-default-system'
        };
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should create DisabledStateRunner for state with no browsers', function() {
        var state = util.makeStateStub();

        var runner = stateRunner.create(state, sessionStub);

        assert.instanceOf(runner, DisabledStateRunner);
    });

    it('should create StateRunner by default', function() {
        var suite = util.makeSuiteStub({browsers: ['some-browser']}),
            state = util.makeStateStub(suite);

        sessionStub.browser.id = 'some-browser';

        var runner = stateRunner.create(state, sessionStub);

        assert.instanceOf(runner, StateRunner);
    });

    it('should pass state, browser session and config to the constructor of DisabledStateRunner', () => {
        const state = util.makeStateStub();

        stateRunner.create(state, sessionStub, configStub);

        assert.calledWith(DisabledStateRunner.prototype.__constructor, state, sessionStub, configStub);
    });
});
