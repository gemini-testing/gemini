'use strict';

var stateRunner = require('lib/runner/state-runner'),
    StateRunner = require('lib/runner/state-runner/state-runner'),
    DisabledStateRunner = require('lib/runner/state-runner/disabled-state-runner'),
    util = require('../../../util');

describe('runner/state-runner', function() {
    var sandbox = sinon.sandbox.create(),
        sessionStub;

    beforeEach(function() {
        sessionStub = {browser: {}};
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
});
