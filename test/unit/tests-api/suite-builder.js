'use strict';

const {noop} = require('lodash');

const SuiteBuilder = require('lib/tests-api/suite-builder');
const Suite = require('lib/suite');
const ActionsBuilder = require('lib/tests-api/actions-builder');
const {find} = require('lib/tests-api/find-func');
const SkipBuilder = require('lib/tests-api/skip/skip-builder');
const OnlyBuilder = require('lib/tests-api/skip/only-builder');

describe('tests-api/suite-builder', () => {
    const sandbox = sinon.sandbox.create();
    let suite;
    let suiteBuilder;

    beforeEach(() => {
        suite = Suite.create('');
        suiteBuilder = new SuiteBuilder(suite);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('setUrl', () => {
        it('should throw if argument is not a string', () => {
            assert.throws(() => {
                suiteBuilder.setUrl({not: 'a string'});
            }, TypeError);
        });

        it('should set url property', () => {
            suiteBuilder.setUrl('http://example.com');
            assert.equal(suite.url, 'http://example.com');
        });

        it('should be chainable', () => {
            assert.equal(
                suiteBuilder.setUrl(''),
                suiteBuilder
            );
        });
    });

    describe('setTolerance', () => {
        it('should throw if argument is not a string', () => {
            assert.throws(() => {
                suiteBuilder.setTolerance('so much');
            }, TypeError);
        });

        it('should set tolerance passed as number', () => {
            suiteBuilder.setTolerance(25);
            assert.equal(suite.tolerance, 25);
        });

        it('should be chainable', () => {
            assert.equal(
                suiteBuilder.setTolerance(0),
                suiteBuilder
            );
        });
    });

    describe('setCaptureElements', () => {
        it('should throw if selector is not a string', () => {
            assert.throws(() => {
                suiteBuilder.setCaptureElements({everything: true});
            }, TypeError);
        });

        it('should throw if selector in array is not a string', () => {
            assert.throws(() => {
                suiteBuilder.setCaptureElements([{everything: true}, '.selector']);
            }, TypeError);
        });

        it('should set captureSelectors property', () => {
            suiteBuilder.setCaptureElements('.selector');

            assert.deepEqual(suite.captureSelectors, ['.selector']);
        });

        it('should accept multiple arguments', () => {
            suiteBuilder.setCaptureElements('.selector1', '.selector2');
            assert.deepEqual(suite.captureSelectors, ['.selector1', '.selector2']);
        });

        it('should accept array', () => {
            suiteBuilder.setCaptureElements(['.selector1', '.selector2']);

            assert.deepEqual(suite.captureSelectors, ['.selector1', '.selector2']);
        });
    });

    describe('ignoreElements', () => {
        it('should throw if selector is a null', () => {
            assert.throws(() => {
                suiteBuilder.ignoreElements(null);
            }, TypeError);
        });

        it('should throw if selector is object without property "every"', () => {
            assert.throws(() => {
                suiteBuilder.ignoreElements({});
            }, TypeError);
        });

        it('should throw if selector is an object with property "every" that not a string', () => {
            assert.throws(() => {
                suiteBuilder.ignoreElements({every: null});
            }, TypeError);
        });

        it('should throw if one of selectors in array has wrong type', () => {
            assert.throws(() => {
                suiteBuilder.ignoreElements([{every: true}, '.selector']);
            }, TypeError);
        });

        it('should set ignoreSelectors property as string', () => {
            suiteBuilder.ignoreElements('.selector');

            assert.deepEqual(suite.ignoreSelectors, ['.selector']);
        });

        it('should set ignoreSelectors property as object with property "every"', () => {
            suiteBuilder.ignoreElements({every: '.selector'});

            assert.deepEqual(suite.ignoreSelectors, [{every: '.selector'}]);
        });

        it('should accept multiple arguments', () => {
            suiteBuilder.ignoreElements('.selector1', {every: '.selector2'});

            assert.deepEqual(suite.ignoreSelectors, ['.selector1', {every: '.selector2'}]);
        });

        it('should accept array', () => {
            suiteBuilder.ignoreElements(['.selector1', {every: '.selector2'}]);

            assert.deepEqual(suite.ignoreSelectors, ['.selector1', {every: '.selector2'}]);
        });
    });

    describe('before', () => {
        beforeEach(() => {
            sandbox.stub(ActionsBuilder, 'create').returns(new ActionsBuilder());
        });

        it('should call before hook with actions builder and find', () => {
            const hook = sinon.stub();

            suiteBuilder.before(hook);

            assert.calledOnce(hook);
            assert.calledWith(hook, sinon.match.instanceOf(ActionsBuilder), find);
        });

        it('should call before hook and set beforeActions property', () => {
            ActionsBuilder.create.returnsArg(0);

            suiteBuilder.before((actions) => {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3], suite.beforeActions);
        });

        it('should call before hook with suite context', () => {
            const hook = sinon.stub();

            suiteBuilder.before(hook);

            assert.equal(
                hook.thisValues[0],
                suite.context
            );
        });

        it('should prepend suite beforeActions with parent beforeActions', () => {
            const parent = Suite.create('parent');
            const suite = Suite.create('suite', parent);

            parent.beforeActions = [1, 2, 3];
            ActionsBuilder.create.returnsArg(0);
            new SuiteBuilder(suite).before((actions) => {
                actions.push(4, 5);
            });

            assert.deepEqual([1, 2, 3, 4, 5], suite.beforeActions);
        });

        it('should not affect parent beforeActions property', () => {
            const parent = Suite.create('parent');
            const suite = Suite.create('suite', parent);

            parent.beforeActions = [1, 2, 3];
            ActionsBuilder.create.returnsArg(0);
            new SuiteBuilder(suite).before((actions) => {
                actions.push(4, 5);
            });

            assert.deepEqual([1, 2, 3], parent.beforeActions);
        });
    });

    describe('after', () => {
        beforeEach(() => {
            sandbox.stub(ActionsBuilder, 'create').returns(new ActionsBuilder());
        });

        it('should call after hook with actions builder and find', () => {
            const hook = sinon.stub();

            suiteBuilder.after(hook);

            assert.calledOnce(hook);
            assert.calledWith(hook, sinon.match.instanceOf(ActionsBuilder), find);
        });

        it('should call after hook and set afterActions property', () => {
            ActionsBuilder.create.returnsArg(0);

            suiteBuilder.after((actions) => {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3], suite.afterActions);
        });

        it('should call after hook with suite context', () => {
            const hook = sinon.stub();

            suiteBuilder.after(hook);

            assert.equal(
                hook.thisValues[0],
                suite.context
            );
        });

        it('should append parent afterActions to suite afterActions', () => {
            const parent = Suite.create('parent');
            const suite = Suite.create('suite', parent);

            parent.afterActions = [4, 5];
            ActionsBuilder.create.returnsArg(0);
            new SuiteBuilder(suite).after((actions) => {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3, 4, 5], suite.afterActions);
        });

        it('should not affect parent afterActions property', () => {
            const parent = Suite.create('parent');
            const suite = Suite.create('suite', parent);

            parent.afterActions = [4, 5];
            ActionsBuilder.create.returnsArg(0);
            new SuiteBuilder(suite).after((actions) => {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([4, 5], parent.afterActions);
        });
    });

    [
        {method: 'capture', viewportOnly: false},
        {method: 'captureViewport', viewportOnly: true}
    ].forEach((value) => {
        const {method, viewportOnly} = value;

        describe(`${method}`, () => {
            beforeEach(() => {
                suiteBuilder
                    .setUrl('/path')
                    .setCaptureElements('.element');
            });

            it('should throw if first argument is not passed', () => {
                assert.throws(() => {
                    suiteBuilder[method]({not: 'a string'});
                }, TypeError);
            });

            it('should throw if second argument is not a function', () => {
                assert.throws(() => {
                    suiteBuilder[method]('state', 'make me a sandwich');
                }, TypeError);
            });

            it('should not throw if second argument is absent', () => {
                assert.doesNotThrow(() => {
                    suiteBuilder[method]('state');
                });
            });

            it('should create named state', () => {
                suiteBuilder[method]('state');
                assert.equal(suite.states[0].name, 'state');
            });

            it('should throw if state with such name already exists', () => {
                assert.throws(() => {
                    suiteBuilder[method]('state');
                    suiteBuilder[method]('state');
                });
            });

            it('should allow to have multiple states of different names', () => {
                suiteBuilder[method]('state 1')[method]('state 2');

                assert.equal(suite.states[0].name, 'state 1');
                assert.equal(suite.states[1].name, 'state 2');
            });

            it('should make new state reference the suite', () => {
                suiteBuilder[method]('state');
                assert.equal(suite.states[0].suite, suite);
            });

            it('should call passed callback with actions builder and find', () => {
                const cb = sinon.stub();

                suiteBuilder[method]('state', cb);

                assert.calledOnce(cb);
                assert.calledWith(cb, sinon.match.instanceOf(ActionsBuilder), find);
            });

            it('should call passed callback with suite context', () => {
                const cb = sinon.stub();

                suiteBuilder[method]('state', cb);

                assert.equal(
                    cb.thisValues[0],
                    suite.context
                );
            });

            it('should set `actions` property', () => {
                sandbox.stub(ActionsBuilder, 'create').returnsArg(0);

                suiteBuilder[method]('state', (actions) => {
                    actions.push(1, 2, 3);
                });

                assert.deepEqual([1, 2, 3], suite.states[0].actions);
            });

            it('should allow to set tolerance', () => {
                suiteBuilder[method]('state', {tolerance: 25}, noop);
                assert.equal(suite.states[0].tolerance, 25);
            });

            it('should throw if tolerance is not a number', () => {
                assert.throws(() => {
                    suiteBuilder[method]('state', {tolerance: 'so much'}, noop);
                }, TypeError);
            });

            it(`should set viewportOnly of state to ${viewportOnly}`, () => {
                suiteBuilder[method]('state', {}, noop);

                assert.equal(suite.states[0].viewportOnly, viewportOnly);
            });

            it('should be chainable', () => {
                assert.equal(suiteBuilder[method]('state'), suiteBuilder);
            });
        });
    });

    describe('SkipBuilder API', () => {
        let suite;
        let skipBuilder;
        let suiteBuilder;

        beforeEach(() => {
            suite = Suite.create('');

            skipBuilder = new SkipBuilder(suite);
            sandbox.stub(SkipBuilder, 'create').returns(skipBuilder);
            sandbox.spy(skipBuilder, 'buildAPI');

            suiteBuilder = new SuiteBuilder(suite);
        });

        it(`should call SkipBuilder's .buildAPI method`, () => {
            assert.calledOnce(skipBuilder.buildAPI);
        });

        it(`should extend SkipBuilder API's methods`, () => {
            const api = skipBuilder.buildAPI.returnValues[0];

            assert.equal(suiteBuilder.skip, api.skip);
            assert.equal(suiteBuilder.skip.in, api.skip.in);
            assert.equal(suiteBuilder.skip.notIn, api.skip.notIn);
        });

        it('should be chainable', () => {
            assert.equal(suiteBuilder.skip('bro'), suiteBuilder);
            assert.equal(suiteBuilder.skip.in('bro'), suiteBuilder);
            assert.equal(suiteBuilder.skip.notIn('bro'), suiteBuilder);
        });
    });

    describe('OnlyBuilder API', () => {
        let suite;
        let onlyBuilder;
        let suiteBuilder;

        beforeEach(() => {
            suite = Suite.create('');

            onlyBuilder = new OnlyBuilder(suite);
            sandbox.stub(OnlyBuilder, 'create').returns(onlyBuilder);
            sandbox.spy(onlyBuilder, 'buildAPI');

            suiteBuilder = new SuiteBuilder(suite);
        });

        it(`should call OnlyBuilder's .buildAPI method`, () => {
            assert.calledOnce(onlyBuilder.buildAPI);
        });

        it(`should extend OnlyBuilder API's methods`, () => {
            const api = onlyBuilder.buildAPI.returnValues[0];

            assert.equal(suiteBuilder.browsers, api.browsers);
            assert.equal(suiteBuilder.only.in, api.only.in);
            assert.equal(suiteBuilder.only.notIn, api.only.notIn);
        });

        it('should be chainable', () => {
            assert.equal(suiteBuilder.browsers('bro'), suiteBuilder);
            assert.equal(suiteBuilder.only.in('bro'), suiteBuilder);
            assert.equal(suiteBuilder.only.notIn('bro'), suiteBuilder);
        });
    });
});
