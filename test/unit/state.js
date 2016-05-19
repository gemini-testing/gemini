'use strict';

const State = require('../../lib/state');
const util = require('../util');
const suiteUtil = require('../../lib/suite-util');

describe('state methods', () => {
    describe('shouldSkip', () => {
        it('should check if state will be skipped', () => {
            const suite = util.makeSuiteStub();
            const state = new State(suite);
            sinon.stub(suiteUtil, 'shouldSkip').returns(true);

            state.shouldSkip('browserId');

            assert.calledWithMatch(suiteUtil.shouldSkip, suite, 'browserId');
        });
    });

    describe('tolerance', () => {
        let suite, state;

        beforeEach(() => {
            suite = util.makeSuiteStub();
            state = new State(suite);
        });

        it('should set tolerance for the current state', () => {
            state.tolerance = 100;

            assert.equal(state.tolerance, 100);
        });

        it('should use suite tolerance value if it was not set for a state', () => {
            suite.tolerance = 1;

            assert.equal(state.tolerance, 1);
        });
    });

    it('should return state fullName', () => {
        const suite = util.makeSuiteStub({name: 'suite-name'});
        const state = new State(suite, 'plain');

        assert.equal(state.fullName, 'suite-name plain');
    });

    ['skipped', 'captureSelectors', 'ignoreSelectors'].forEach((method) => {
        it(`should return suite ${method} value`, () => {
            const suite = util.makeSuiteStub();
            suite[method] = 'value';
            const state = new State(suite);

            assert.equal(state[method], suite[method]);
        });
    });
});
