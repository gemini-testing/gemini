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
});
