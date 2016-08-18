'use strict';

const proxyquire = require('proxyquire');

const StateRunner = require('lib/runner/state-runner/state-runner');
const util = require('../../../util');

describe('runner/state-runner', () => {
    const sandbox = sinon.sandbox.create();

    let StateRunnerFactory;
    let DisabledStateRunner;

    let sessionStub;
    let configStub;

    beforeEach(() => {
        sessionStub = {browser: {}};
        configStub = {fake: 'value'};

        DisabledStateRunner = sandbox.stub();

        StateRunnerFactory = proxyquire('lib/runner/state-runner', {
            './disabled-state-runner': DisabledStateRunner
        });
    });

    afterEach(() => sandbox.restore());

    it('should create DisabledStateRunner for state with no browsers', () => {
        const state = util.makeStateStub();

        const runner = StateRunnerFactory.create(state, sessionStub);

        assert.instanceOf(runner, DisabledStateRunner);
    });

    it('should pass state, browser session and config to the constructor of DisabledStateRunner', () => {
        const state = util.makeStateStub();

        StateRunnerFactory.create(state, sessionStub, configStub);

        assert.calledWith(DisabledStateRunner, state, sessionStub, configStub);
    });

    it('should create StateRunner by default', () => {
        const suite = util.makeSuiteStub({browsers: ['some-browser']});
        const state = util.makeStateStub(suite);

        sessionStub.browser.id = 'some-browser';

        const runner = StateRunnerFactory.create(state, sessionStub);

        assert.instanceOf(runner, StateRunner);
    });
});
