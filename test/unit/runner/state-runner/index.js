'use strict';

var stateRunner = require('../../../../lib/runner/state-runner'),
    StateRunner = require('../../../../lib/runner/state-runner/state-runner'),
    DisabledStateRunner = require('../../../../lib/runner/state-runner/disabled-state-runner'),
    suiteUtil = require('../../../../lib/suite-util'),
    util = require('../../../util');

describe('runner/state-runner', function() {
    var sandbox = sinon.sandbox.create(),
        sessionStub = {browser: {}};

    beforeEach(function() {
        sandbox.stub(suiteUtil, 'isDisabled').returns(false);
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should create StateRunner by default', function() {
        var state = util.makeStateStub();

        var runner = stateRunner.create(state, sessionStub);

        assert.instanceOf(runner, StateRunner);
    });

    it('should create DisabledStateRunner for disabled state', function() {
        var state = util.makeStateStub();
        suiteUtil.isDisabled.returns(true);

        var runner = stateRunner.create(state, sessionStub);

        assert.instanceOf(runner, DisabledStateRunner);
    });
});
