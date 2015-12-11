'use strict';

var createSuite = require('../../lib/suite').create;

describe('suite', function() {
    describe('create', function() {
        it('should create named suite', function() {
            var suite = createSuite('some name');
            assert.equal(suite.name, 'some name');
        });

        it('should inherit properties from parent, if any', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            parent.url = 'http://example.com';

            assert.equal(child.url, parent.url);
        });

        it('should allow to overwrite parent properties', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            parent.url = 'http://example.com';
            child.url = 'http://example2.com';

            assert.notEqual(child.url, parent.url);
        });

        it('should set `parent` property of a parent suite', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            assert.equal(child.parent, parent);
        });

        it('should add new suite to the parent\'s children', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            assert.include(parent.children, child);
        });
    });

    describe('states', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be empty by default', function() {
            assert.lengthOf(this.suite.states, 0);
        });

        it('should not be writable', function() {
            var suite = this.suite;

            assert.throws(function() {
                suite.states = [];
            });
        });

        it('should not be inherited', function() {
            var child = createSuite('child', this.suite);
            this.suite.addState({});
            assert.lengthOf(child.states, 0);
        });
    });

    describe('addState', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should modify states property', function() {
            var state = {name: 'some state'};
            this.suite.addState(state);
            assert.equal(this.suite.states[0], state);
        });
    });

    describe('hasStates', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be false if there is no states', function() {
            assert.isFalse(this.suite.hasStates);
        });

        it('should be true if there are states', function() {
            this.suite.addState({name: 'state'});

            assert.isTrue(this.suite.hasStates);
        });
    });

    describe('isRoot', function() {
        it('should be true for root suites', function() {
            var suite = createSuite('suite');
            assert.isTrue(suite.isRoot);
        });

        it('should be false for child suites', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            assert.isFalse(child.isRoot);
        });
    });

    describe('skipped', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
            this.matcher = {a: 1};
            this.matcher2 = {b: 2};
        });

        it('should be false by default', function() {
            assert.isFalse(this.suite.skipped);
        });

        it('should be changed by skip(object) method', function() {
            this.suite.skip(this.matcher);
            assert.deepEqual(this.suite.skipped, [this.matcher]);
        });

        it('should be inherited by children', function() {
            this.suite.skip();

            var child = createSuite('child', this.suite);
            assert.isTrue(child.skipped);
        });

        it('should merge multiple matchers together', function() {
            this.suite.skip(this.matcher);
            this.suite.skip(this.matcher2);

            assert.deepEqual(this.suite.skipped, [this.matcher, this.matcher2]);
        });

        it('should not override `true` by browser list', function() {
            this.suite.skip();
            this.suite.skip(this.matcher);

            assert.isTrue(this.suite.skipped);
        });

        it('should override browser list by `true`', function() {
            this.suite.skip(this.matcher);
            this.suite.skip();

            assert.isTrue(this.suite.skipped);
        });

        it('should merge children list with parent', function() {
            this.suite.skip(this.matcher);
            var child = createSuite('child', this.suite);
            child.skip(this.matcher2);

            assert.deepEqual(child.skipped, [this.matcher, this.matcher2]);
        });

        it('should not affect parent when calling .skip() on child', function() {
            this.suite.skip(this.matcher);
            var child = createSuite('child', this.suite);
            child.skip(this.matcher2);

            assert.deepEqual(this.suite.skipped, [this.matcher]);
        });
    });

    describe('hasChildNamed', function() {
        beforeEach(function() {
            this.suite = createSuite('parent');
            createSuite('has', this.suite);
        });

        it('should return true when suite has child of a given name', function() {
            assert.isTrue(this.suite.hasChildNamed('has'));
        });

        it('should return fals when suite has no child of a given name', function() {
            assert.isFalse(this.suite.hasChildNamed('has no'));
        });
    });

    describe('hasStateNamed', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
            this.suite.addState({name: 'has'});
        });

        it('should return true when suite has state of a given name', function() {
            assert.isTrue(this.suite.hasStateNamed('has'));
        });

        it('should return true when suite has state of a given name', function() {
            assert.isFalse(this.suite.hasStateNamed('has no'));
        });
    });

    describe('fullName', function() {
        beforeEach(function() {
            this.parent = createSuite('parent');
            this.child = createSuite('child', this.parent);
        });

        it('should return name for top level suite', function() {
            assert.equal(this.parent.fullName, 'parent');
        });

        it('should concat own name with parents', function() {
            assert.equal(this.child.fullName, 'parent child');
        });
    });
});
