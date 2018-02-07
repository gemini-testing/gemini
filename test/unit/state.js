'use strict';

const State = require('lib/state');
const util = require('../util');

describe('state methods', () => {
    describe('shouldSkip', () => {
        it('should check if state will be skipped', () => {
            const suite = util.makeSuiteStub();
            suite.shouldSkip = sinon.stub();
            suite.shouldSkip.withArgs('browserId').returns(true);
            const state = new State(suite);

            assert.isTrue(state.shouldSkip('browserId'));
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

    describe('viewportOnly', () => {
        let suite, state;

        beforeEach(() => {
            suite = util.makeSuiteStub();
            state = new State(suite);
        });

        it('viewportOnly should be false by default', () => {
            assert.isFalse(state.viewportOnly);
        });

        it('should set viewportOnly for the current state', () => {
            state.viewportOnly = true;

            assert.isTrue(state.viewportOnly);
        });

        it('should return null for captureSelectors if viewportOnly is true', () => {
            suite.captureSelectors = 'selector';
            state.viewportOnly = true;

            assert.isNull(state.captureSelectors);
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

    describe('clone method', () => {
        it('should return cloned state', () => {
            const state = new State({});
            const clonedState = state.clone();

            assert.notEqual(state, clonedState);
        });

        it('should clone actions from the origin state', () => {
            const state = new State({});
            state.actions.push('actions');

            const clonedState = state.clone();
            state.actions.push('anotherAction');

            assert.deepEqual(clonedState.actions, ['actions']);
        });

        it('should clone tolerance from the origin state', () => {
            const state = new State({});
            state.tolerance = 100;

            const clonedState = state.clone();

            assert.equal(clonedState.tolerance, 100);
        });

        it('should clone viewportOnly from the origin state', () => {
            const state = new State({});
            state.viewportOnly = true;

            const clonedState = state.clone();

            assert.isTrue(clonedState.viewportOnly);
        });
    });
});
