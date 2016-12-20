'use strict';

var SuiteBuilder = require('lib/tests-api/suite-builder'),
    Suite = require('lib/suite'),
    ActionsBuilder = require('lib/tests-api/actions-builder'),
    find = require('lib/tests-api/find-func').find;

describe('tests-api/suite-builder', function() {
    var sandbox = sinon.sandbox.create(),
        suite,
        suiteBuilder;

    beforeEach(function() {
        suite = Suite.create('');
        suiteBuilder = new SuiteBuilder(suite);
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('setUrl', function() {
        it('should throw if argument is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setUrl({not: 'a string'});
            }, TypeError);
        });

        it('should set url property', function() {
            suiteBuilder.setUrl('http://example.com');
            assert.equal(suite.url, 'http://example.com');
        });

        it('should be chainable', function() {
            assert.equal(
                suiteBuilder.setUrl(''),
                suiteBuilder
            );
        });
    });

    describe('setTolerance', function() {
        it('should throw if argument is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setTolerance('so much');
            }, TypeError);
        });

        it('should set tolerance passed as number', function() {
            suiteBuilder.setTolerance(25);
            assert.equal(suite.tolerance, 25);
        });

        it('should be chainable', function() {
            assert.equal(
                suiteBuilder.setTolerance(0),
                suiteBuilder
            );
        });
    });

    describe('setCaptureElements', function() {
        it('should throw if selector is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setCaptureElements({everything: true});
            }, TypeError);
        });

        it('should throw if selector in array is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setCaptureElements([{everything: true}, '.selector']);
            }, TypeError);
        });

        it('should set captureSelectors property', function() {
            suiteBuilder.setCaptureElements('.selector');

            assert.deepEqual(suite.captureSelectors, ['.selector']);
        });

        it('should accept multiple arguments', function() {
            suiteBuilder.setCaptureElements('.selector1', '.selector2');
            assert.deepEqual(suite.captureSelectors, ['.selector1', '.selector2']);
        });

        it('should accept array', function() {
            suiteBuilder.setCaptureElements(['.selector1', '.selector2']);

            assert.deepEqual(suite.captureSelectors, ['.selector1', '.selector2']);
        });
    });

    describe('ignoreElements', function() {
        it('should throw if selector is a null', function() {
            assert.throws(function() {
                suiteBuilder.ignoreElements(null);
            }, TypeError);
        });

        it('should throw if selector is object without property "every"', function() {
            assert.throws(function() {
                suiteBuilder.ignoreElements({});
            }, TypeError);
        });

        it('should throw if selector is an object with property "every" that not a string', function() {
            assert.throws(function() {
                suiteBuilder.ignoreElements({every: null});
            }, TypeError);
        });

        it('should throw if one of selectors in array has wrong type', function() {
            assert.throws(function() {
                suiteBuilder.ignoreElements([{every: true}, '.selector']);
            }, TypeError);
        });

        it('should set ignoreSelectors property as string', function() {
            suiteBuilder.ignoreElements('.selector');

            assert.deepEqual(suite.ignoreSelectors, ['.selector']);
        });

        it('should set ignoreSelectors property as object with property "every"', function() {
            suiteBuilder.ignoreElements({every: '.selector'});

            assert.deepEqual(suite.ignoreSelectors, [{every: '.selector'}]);
        });

        it('should accept multiple arguments', function() {
            suiteBuilder.ignoreElements('.selector1', {every: '.selector2'});

            assert.deepEqual(suite.ignoreSelectors, ['.selector1', {every: '.selector2'}]);
        });

        it('should accept array', function() {
            suiteBuilder.ignoreElements(['.selector1', {every: '.selector2'}]);

            assert.deepEqual(suite.ignoreSelectors, ['.selector1', {every: '.selector2'}]);
        });
    });

    describe('before', function() {
        beforeEach(function() {
            sandbox.stub(ActionsBuilder.prototype, '__constructor');
        });

        it('should call before hook with actions builder and find', function() {
            var hook = sinon.stub();

            suiteBuilder.before(hook);

            assert.calledOnce(hook);
            assert.calledWith(hook, sinon.match.instanceOf(ActionsBuilder), find);
        });

        it('should call before hook and set beforeActions property', function() {
            ActionsBuilder.prototype.__constructor.returnsArg(0);

            suiteBuilder.before(function(actions) {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3], suite.beforeActions);
        });

        it('should call before hook with suite context', function() {
            var hook = sinon.stub();

            suiteBuilder.before(hook);

            assert.equal(
                hook.thisValues[0],
                suite.context
            );
        });

        it('should prepend suite beforeActions with parent beforeActions', function() {
            var parent = Suite.create('parent'),
                suite = Suite.create('suite', parent);

            parent.beforeActions = [1, 2, 3];
            ActionsBuilder.prototype.__constructor.returnsArg(0);
            new SuiteBuilder(suite).before(function(actions) {
                actions.push(4, 5);
            });

            assert.deepEqual([1, 2, 3, 4, 5], suite.beforeActions);
        });

        it('should not affect parent beforeActions property', function() {
            var parent = Suite.create('parent'),
                suite = Suite.create('suite', parent);

            parent.beforeActions = [1, 2, 3];
            ActionsBuilder.prototype.__constructor.returnsArg(0);
            new SuiteBuilder(suite).before(function(actions) {
                actions.push(4, 5);
            });

            assert.deepEqual([1, 2, 3], parent.beforeActions);
        });
    });

    describe('after', function() {
        beforeEach(function() {
            sandbox.stub(ActionsBuilder.prototype, '__constructor');
        });

        it('should call after hook with actions builder and find', function() {
            var hook = sinon.stub();

            suiteBuilder.after(hook);

            assert.calledOnce(hook);
            assert.calledWith(hook, sinon.match.instanceOf(ActionsBuilder), find);
        });

        it('should call after hook and set afterActions property', function() {
            ActionsBuilder.prototype.__constructor.returnsArg(0);

            suiteBuilder.after(function(actions) {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3], suite.afterActions);
        });

        it('should call after hook with suite context', function() {
            var hook = sinon.stub();

            suiteBuilder.after(hook);

            assert.equal(
                hook.thisValues[0],
                suite.context
            );
        });

        it('should append parent afterActions to suite afterActions', function() {
            var parent = Suite.create('parent'),
                suite = Suite.create('suite', parent);

            parent.afterActions = [4, 5];
            ActionsBuilder.prototype.__constructor.returnsArg(0);
            new SuiteBuilder(suite).after(function(actions) {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3, 4, 5], suite.afterActions);
        });

        it('should not affect parent afterActions property', function() {
            var parent = Suite.create('parent'),
                suite = Suite.create('suite', parent);

            parent.afterActions = [4, 5];
            ActionsBuilder.prototype.__constructor.returnsArg(0);
            new SuiteBuilder(suite).after(function(actions) {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([4, 5], parent.afterActions);
        });
    });

    describe('capture', function() {
        beforeEach(function() {
            suiteBuilder
                .setUrl('/path')
                .setCaptureElements('.element');
        });

        it('should throw if first argument is not passed', function() {
            assert.throws(function() {
                suiteBuilder.capture({not: 'a string'});
            }, TypeError);
        });

        it('should throw if second argument is not a function', function() {
            assert.throws(function() {
                suiteBuilder.capture('state', 'make me a sandwich');
            }, TypeError);
        });

        it('should not throw if second argument is absent', function() {
            assert.doesNotThrow(function() {
                suiteBuilder.capture('state');
            });
        });

        it('should create named state', function() {
            suiteBuilder.capture('state');
            assert.equal(suite.states[0].name, 'state');
        });

        it('should throw if state with such name already exists', function() {
            assert.throws(function() {
                suiteBuilder.capture('state');
                suiteBuilder.capture('state');
            });
        });

        it('should allow to have multiple states of different names', function() {
            suiteBuilder
                .capture('state 1')
                .capture('state 2');

            assert.equal(suite.states[0].name, 'state 1');
            assert.equal(suite.states[1].name, 'state 2');
        });

        it('should make new state reference the suite', function() {
            suiteBuilder.capture('state');
            assert.equal(suite.states[0].suite, suite);
        });

        it('should call passed callback with actions builder and find', function() {
            var cb = sinon.stub();

            suiteBuilder.capture('state', cb);

            assert.calledOnce(cb);
            assert.calledWith(cb, sinon.match.instanceOf(ActionsBuilder), find);
        });

        it('should call passed callback with suite context', function() {
            var cb = sinon.stub();

            suiteBuilder.capture('state', cb);

            assert.equal(
                cb.thisValues[0],
                suite.context
            );
        });

        it('should set `actions` property', function() {
            sandbox.stub(ActionsBuilder.prototype, '__constructor').returnsArg(0);

            suiteBuilder.capture('state', function(actions) {
                actions.push(1, 2, 3);
            });

            assert.deepEqual([1, 2, 3], suite.states[0].actions);
        });

        it('should allow to set tolerance', function() {
            suiteBuilder.capture('state', {tolerance: 25}, function() {});
            assert.equal(suite.states[0].tolerance, 25);
        });

        it('should throw if tolerance is not a number', function() {
            assert.throws(function() {
                suiteBuilder.capture('state', {tolerance: 'so much'}, function() {});
            }, TypeError);
        });

        it('should be chainable', function() {
            assert.equal(suiteBuilder.capture('state'), suiteBuilder);
        });
    });

    describe('skip', function() {
        it('should throw if argument is not a string nor RegExp', function() {
            assert.throws(function() {
                suiteBuilder.skip(123);
            }, TypeError);
        });

        it('should throw if argument is array with non-string or non-RegExp', function() {
            assert.throws(function() {
                suiteBuilder.skip([123]);
            }, TypeError);
        });

        it('should throw if argument is an object', function() {
            assert.throws(function() {
                suiteBuilder.skip({browserName: 'name', version: '123', id: 'browser'});
            }, Error);
        });

        it('should mark suite as skipped', function() {
            suiteBuilder.skip();
            assert.isTrue(suite.skipped);
        });

        it('should accept skipped browser string id', function() {
            suiteBuilder.skip('opera');

            assert.equal(suite.skipped.length, 1);
            assert.isTrue(suite.skipped[0].matches('opera'));
            assert.isFalse(suite.skipped[0].matches('firefox'));
        });

        it('should accept skipped browser RegExp', function() {
            suiteBuilder.skip(/ie1.*/);

            assert.isTrue(suite.skipped[0].matches('ie11'));
            assert.isFalse(suite.skipped[0].matches('ie8'));
        });

        it('should accept array of string ids and RegExp\'s', function() {
            suiteBuilder.skip([
                'ie11',
                /firefox/
            ]);

            assert.isTrue(suite.skipped[0].matches('ie11'));
            assert.isTrue(suite.skipped[1].matches('firefox33'));
        });
    });

    describe('browsers', function() {
        var rootSuite;

        beforeEach(function() {
            rootSuite = Suite.create('');
            suite = Suite.create('some-suite', rootSuite);
            suiteBuilder = new SuiteBuilder(suite);
        });

        it('should throw without an argument', function() {
            assert.throws(function() {
                suiteBuilder.browsers();
            }, /string or RegExp/);
        });

        it('should throw if an argument is not a string or RegExp', function() {
            assert.throws(function() {
                suiteBuilder.browsers(123);
            }, /string or RegExp/);
        });

        it('should throw if an argument is an array of non-strings or non-RegExps', function() {
            assert.throws(function() {
                suiteBuilder.browsers([123]);
            }, /string or RegExp/);
        });

        it('should filter suite browsers by a string', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(suite.browsers, ['chrome']);
        });

        it('should filter suite browsers by a RegExp', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers(/ie.+/);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9']);
        });

        it('should filter suite browsers by an array of strings', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers(['chrome']);

            assert.deepEqual(suite.browsers, ['chrome']);
        });

        it('should filter suite browsers by an array of RegExps', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers([/ie.+/]);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9']);
        });

        it('should filter suite browsers by an array of strings and RegExps', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers([/ie.+/, 'chrome']);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9', 'chrome']);
        });

        it('should not set a browser for a suite if it is not specified in a root one', function() {
            rootSuite.browsers = ['opera'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(suite.browsers, []);
        });

        it('should be chainable', function() {
            assert.equal(suiteBuilder.browsers([]), suiteBuilder);
        });

        it('should filter browsers in all children suites', function() {
            var firstChild = Suite.create('firstChild', suite),
                secondChild = Suite.create('secondChild', suite);

            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers([/ie.+/, 'chrome']);
            new SuiteBuilder(firstChild).browsers(/ie.+/);
            new SuiteBuilder(secondChild).browsers('chrome');

            assert.deepEqual(suite.browsers, ['ie8', 'ie9', 'chrome']);
            assert.deepEqual(firstChild.browsers, ['ie8', 'ie9']);
            assert.deepEqual(secondChild.browsers, ['chrome']);
        });

        it('should pass filtered browsers from a parent suite to a child one', function() {
            var childSuite = Suite.create('child', suite);

            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(childSuite.browsers, ['chrome']);
        });
    });
});
