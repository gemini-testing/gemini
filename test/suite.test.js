'use strict';

var createSuite = require('../lib/suite').create;

describe('suite', function() {
    describe('create', function() {
        it('should create named suite', function() {
            var suite = createSuite('some name');
            suite.name.must.equal('some name');
        });

        it('should inherit properties from parent, if any', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            parent.url = 'http://example.com';

            child.url.must.equal(parent.url);
        });

        it('should allow to overwrite parent properties', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            parent.url = 'http://example.com';
            child.url = 'http://example2.com';

            child.url.must.not.equal(parent.url);
        });

        it('should set `parent` property of a parent suite', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            child.parent.must.be(parent);
        });

        it('should add new suite to the parent\'s children', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            parent.children.must.contain(child);
        });
    });

    describe('states', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be empty by default', function() {
            this.suite.states.length.must.be(0);
        });

        it('should not be writable', function() {
            var suite = this.suite;

            (function() {
                suite.states = [];
            }.must.throw());
        });

        it('should not be inherited', function() {
            var child = createSuite('child', this.suite);
            this.suite.addState({});
            child.states.length.must.be(0);
        });
    });

    describe('addState', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should modify states property', function() {
            var state = {name: 'some state'};
            this.suite.addState(state);
            this.suite.states[0].must.be(state);
        });
    });

    describe('hasStates', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be false if there is no states', function() {
            this.suite.hasStates.must.be.false();
        });

        it('should be true if there are states', function() {
            this.suite.addState({name: 'state'});

            this.suite.hasStates.must.be.true();
        });
    });

    describe('isRoot', function() {
        it('should be true for root suites', function() {
            var suite = createSuite('suite');
            suite.isRoot.must.be.true();
        });

        it('should be false for child suites', function() {
            var parent = createSuite('parent'),
                child = createSuite('child', parent);

            child.isRoot.must.be.false();
        });
    });

    describe('skipped', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be false by default', function() {
            this.suite.skipped.must.be.false();
        });

        it('should be changed by skip() method', function() {
            this.suite.skip();
            this.suite.skipped.must.be.true();
        });

        it('should be inherited by children', function() {
            this.suite.skip();

            var child = createSuite('child', this.suite);
            child.skipped.must.be.true();
        });

        it('should accept browsers list', function() {
            var list = [
                {browserName: 'browser1', version: '1.0'},
                {browserName: 'browser2', version: '2.0'}
            ];

            this.suite.skip(list);
            this.suite.skipped.must.eql(list);
        });

        it('should merge multiple lists together', function() {
            this.suite.skip([{browserName: 'browser1', version: '1.0'}]);
            this.suite.skip([{browserName: 'browser2'}]);

            this.suite.skipped.must.eql([
                {browserName: 'browser1', version: '1.0'},
                {browserName: 'browser2'}
            ]);
        });

        it('should not override `true` by browser list', function() {
            this.suite.skip();
            this.suite.skip([{browserName: 'browser1', version: '1.0'}]);

            this.suite.skipped.must.be.true();
        });

        it('should override browser list by `true`', function() {
            this.suite.skip([{browserName: 'browser1', version: '1.0'}]);
            this.suite.skip();

            this.suite.skipped.must.be.true();
        });

        it('should merge children list with parent', function() {
            this.suite.skip([{browserName: 'browser1', version: '1.0'}]);
            var child = createSuite('child', this.suite);
            child.skip([{browserName: 'browser2'}]);

            child.skipped.must.eql([
                {browserName: 'browser1', version: '1.0'},
                {browserName: 'browser2'}
            ]);
        });

        it('should not affect parent when calling .skip() on child', function() {
            this.suite.skip([{browserName: 'browser1', version: '1.0'}]);
            var child = createSuite('child', this.suite);
            child.skip([{browserName: 'browser2'}]);

            this.suite.skipped.must.eql([
                {browserName: 'browser1', version: '1.0'}
            ]);
        });
    });

    describe('hasChildNamed', function() {
        beforeEach(function() {
            this.suite = createSuite('parent');
            createSuite('has', this.suite);
        });

        it('should return true when suite has child of a given name', function() {
            this.suite.hasChildNamed('has').must.be.true();
        });

        it('should return fals when suite has no child of a given name', function() {
            this.suite.hasChildNamed('has no').must.be.false();
        });
    });

    describe('hasStateNamed', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
            this.suite.addState({name: 'has'});
        });

        it('should return true when suite has state of a given name', function() {
            this.suite.hasStateNamed('has').must.be.true();
        });

        it('should return true when suite has state of a given name', function() {
            this.suite.hasStateNamed('has no').must.be.false();
        });
    });

    describe('deepStatesCount', function() {
        beforeEach(function() {
            this.suite = createSuite('suite');
        });

        it('should be 0 for suite without children and states', function() {
            this.suite.deepStatesCount.must.be(0);
        });

        it('should equal to number of states for suite without children', function() {
            this.suite.addState({});
            this.suite.addState({});
            this.suite.deepStatesCount.must.be(2);
        });

        it('should equal to own number of states plus number of states in children', function() {
            this.suite.addState({});
            this.suite.addState({});
            var child = createSuite('child', this.suite);
            child.addState({});
            this.suite.deepStatesCount.must.be(3);
        });
    });
});
