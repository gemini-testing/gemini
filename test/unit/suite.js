'use strict';

const createSuite = require('lib/suite').create;
const State = require('lib/state');
const mkTree = require('../util').makeSuiteTree;

describe('suite', () => {
    describe('create', () => {
        it('should create named suite', () => {
            const suite = createSuite('some name');
            assert.equal(suite.name, 'some name');
        });

        it('should inherit properties from parent, if any', () => {
            const parent = createSuite('parent');
            const child = createSuite('child', parent);

            parent.url = 'http://example.com';

            assert.equal(child.url, parent.url);
        });

        it('should allow to overwrite parent properties', () => {
            const parent = createSuite('parent');
            const child = createSuite('child', parent);

            parent.url = 'http://example.com';
            child.url = 'http://example2.com';

            assert.notEqual(child.url, parent.url);
        });

        it('should set `parent` property of a parent suite', () => {
            const parent = createSuite('parent');
            const child = createSuite('child', parent);

            assert.equal(child.parent, parent);
        });

        it('child suite should have same data in context as parent', () => {
            const parent = createSuite('parent');
            parent.context.some = 'data';

            const child = createSuite('child', parent);

            assert.deepEqual(child.context, {some: 'data'});
        });

        it('modifications of child context should not affect parent context', () => {
            const parent = createSuite('parent');
            parent.context.some = 'data';

            const child = createSuite('child', parent);
            child.context.some = 'other-data';
            child.context.other = 'data';

            assert.deepEqual(parent.context, {some: 'data'});
        });

        it('should not allow to create suite with empty name', () => {
            const parent = createSuite('parent');

            assert.throws(() => createSuite('', parent), /Empty suite name/);
        });
    });

    describe('states', () => {
        let suite;

        beforeEach(() => {
            suite = createSuite('suite');
        });

        it('should be empty by default', () => {
            assert.lengthOf(suite.states, 0);
        });

        it('should not be writable', () => {
            assert.throws(() => suite.states = []);
        });

        it('should not be inherited', () => {
            const child = createSuite('child', suite);
            suite.addState({});
            assert.lengthOf(child.states, 0);
        });
    });

    describe('addChild', () => {
        it('should add child for parent suite', () => {
            const suite = createSuite('suite');
            const child = createSuite('child', suite);
            suite.addChild(child);
            assert.equal(suite.children[0], child);
        });

        it('should set himself as a parent for child suite', () => {
            const suite = createSuite('suite');
            const anotherSuite = createSuite('another-suite');
            suite.addChild(anotherSuite);
            assert.equal(anotherSuite.parent, suite);
        });

        it('child suite should inherit properties from the parent', () => {
            const suite = createSuite('suite');
            const anotherSuite = createSuite('another-suite');
            suite.addChild(anotherSuite);
            assert.equal(Object.getPrototypeOf(anotherSuite), suite);
        });
    });

    describe('addState', () => {
        let suite;

        beforeEach(() => {
            suite = createSuite('suite');
        });

        it('should modify states property', () => {
            const state = {name: 'some state'};
            suite.addState(state);
            assert.equal(suite.states[0], state);
        });

        it('should redefine parent suite for state', () => {
            const state = {name: 'some state'};
            suite.addState(state);
            assert.equal(state.suite, suite);
        });
    });

    describe('hasStates', () => {
        let suite;

        beforeEach(() => {
            suite = createSuite('suite');
        });

        it('should be false if there is no states', () => {
            assert.isFalse(suite.hasStates);
        });

        it('should be true if there are states', () => {
            suite.addState({name: 'state'});

            assert.isTrue(suite.hasStates);
        });
    });

    describe('isRoot', () => {
        it('should be true for root suites', () => {
            const suite = createSuite('suite');
            assert.isTrue(suite.isRoot);
        });

        it('should be false for child suites', () => {
            const parent = createSuite('parent');
            const child = createSuite('child', parent);

            assert.isFalse(child.isRoot);
        });
    });

    describe('skipped', () => {
        let suite;
        let matcher;
        let matcher2;

        beforeEach(() => {
            suite = createSuite('suite');
            matcher = {a: 1};
            matcher2 = {b: 2};
        });

        it('should be false by default', () => {
            assert.isFalse(suite.skipped);
        });

        it('should be changed by skip(object) method', () => {
            suite.skip(matcher);
            assert.deepEqual(suite.skipped, [matcher]);
        });

        it('should be inherited by children', () => {
            suite.skip();

            const child = createSuite('child', suite);
            assert.isTrue(child.skipped);
        });

        it('should merge multiple matchers together', () => {
            suite.skip(matcher);
            suite.skip(matcher2);

            assert.deepEqual(suite.skipped, [matcher, matcher2]);
        });

        it('should not override `true` by browser list', () => {
            suite.skip();
            suite.skip(matcher);

            assert.isTrue(suite.skipped);
        });

        it('should override browser list by `true`', () => {
            suite.skip(matcher);
            suite.skip();

            assert.isTrue(suite.skipped);
        });

        it('should merge children list with parent', () => {
            suite.skip(matcher);
            const child = createSuite('child', suite);
            child.skip(matcher2);

            assert.deepEqual(child.skipped, [matcher, matcher2]);
        });

        it('should not affect parent when calling .skip() on child', () => {
            suite.skip(matcher);
            const child = createSuite('child', suite);
            child.skip(matcher2);

            assert.deepEqual(suite.skipped, [matcher]);
        });
    });

    describe('shouldSkip', () => {
        let suite;

        const createBrowserSkipMatcher = (browserId) => {
            const matcher = {matches: sinon.stub()};
            matcher.matches.withArgs(browserId).returns(true);

            return matcher;
        };

        beforeEach(() => suite = createSuite('suite'));

        it('should be "false" for any browser if a suite is not skipped', function() {
            assert.isFalse(suite.shouldSkip('browser'));
        });

        it('should be "true" for any browser if a suite is skipped', () => {
            suite.skip();

            assert.isTrue(suite.shouldSkip('browser'));
        });

        it('should be "true" for a browser if a suite is skipped in it', () => {
            suite.skip(createBrowserSkipMatcher('1st-skipped-bro'));
            suite.skip(createBrowserSkipMatcher('2nd-skipped-bro'));

            assert.isTrue(suite.shouldSkip('1st-skipped-bro'));
            assert.isTrue(suite.shouldSkip('2nd-skipped-bro'));
        });

        it('should set a skip comment if a suite is skipped in a browser', () => {
            suite.skip({matches: sinon.stub().withArgs('skipped-bro').returns(true), comment: 'skip-comment'});

            suite.shouldSkip('skipped-bro');
            assert.equal(suite.skipComment, 'skip-comment');
        });

        it('should be "false" for a browser if a suite is not skipped in it', () => {
            suite.skip(createBrowserSkipMatcher('1st-skipped-bro'));
            suite.skip(createBrowserSkipMatcher('2st-skipped-bro'));

            assert.isFalse(suite.shouldSkip('some-bro'));
        });
    });

    describe('hasChild', () => {
        let suite;

        beforeEach(() => {
            suite = createSuite('parent');
            const child = createSuite('has', suite);
            child.browsers = ['bro1', 'bro2'];
            suite.addChild(child);
        });

        it('should return true when suite has child with given name and intersected browser set', () => {
            assert.isTrue(suite.hasChild('has', ['bro1']));
        });

        describe('should return false when', () => {
            it('suite has no child with given name', () => {
                assert.isFalse(suite.hasChild('has no', []));
            });

            it('has child with given name and not intersected browser set', () => {
                assert.isFalse(suite.hasChild('has no', ['bad-bro']));
            });
        });
    });

    describe('hasStateNamed', () => {
        let suite;

        beforeEach(() => {
            suite = createSuite('suite');
            suite.addState({name: 'has'});
        });

        it('should return true when suite has state of a given name', () => {
            assert.isTrue(suite.hasStateNamed('has'));
        });

        it('should return true when suite has state of a given name', () => {
            assert.isFalse(suite.hasStateNamed('has no'));
        });
    });

    describe('fullName', () => {
        let parent;
        let child;

        beforeEach(() => {
            parent = createSuite('parent');
            child = createSuite('child', parent);
        });

        it('should return name for top level suite', () => {
            assert.equal(parent.fullName, 'parent');
        });

        it('should concat own name with parents', () => {
            assert.equal(child.fullName, 'parent child');
        });
    });

    describe('suite clone', () => {
        let sandbox;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        afterEach(() => sandbox.restore());

        it('should return cloned suite', () => {
            const suite = createSuite('origin');
            const clonedSuite = suite.clone();

            assert.notEqual(clonedSuite, suite);
        });

        it('should clone nested suites', () => {
            const tree = mkTree({
                suite: {
                    child: []
                }
            });
            const childSuite = tree.child;
            sandbox.stub(childSuite, 'clone').returns({});

            tree.suite.clone();

            assert.calledOnce(childSuite.clone);
        });

        it('should not change child suite count while cloning', () => {
            const tree = mkTree({
                suite: {
                    child: []
                }
            });
            const clonedSuite = tree.suite.clone();

            assert.lengthOf(clonedSuite.children, 1);
        });

        it('should redefine parent for nested suites', () => {
            const suite = createSuite('origin');
            const childSuite = createSuite('child suite');
            suite.addChild(childSuite);

            const clonedSuite = suite.clone();

            assert.deepEqual(clonedSuite.children[0].parent, clonedSuite);
        });

        it('should clone nested states', () => {
            const suite = createSuite('origin');
            const state = new State(suite);
            sandbox.stub(state, 'clone').returns({});
            suite.addState(state);

            suite.clone();

            assert.calledOnce(state.clone);
        });

        it('should redefine parent suite for state', () => {
            const suite = createSuite('origin');
            const state = new State(suite);
            suite.addState(state);

            const clonedSuite = suite.clone();

            assert.equal(clonedSuite.states[0].suite, clonedSuite);
        });

        it('should not change state count while cloning', () => {
            const suite = createSuite('origin');
            const state1 = new State(suite);
            const state2 = new State(suite);
            suite.addState(state1);
            suite.addState(state2);

            const clonedSuite = suite.clone();

            assert.lengthOf(clonedSuite.states, 2);
        });
    });
});
