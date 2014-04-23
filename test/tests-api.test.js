'use strict';

var sinon = require('sinon'),
    testsApi = require('../lib/tests-api'),
    Suite = require('../lib/suite');

describe('public tests API', function() {
    beforeEach(function() {
        this.suite = Suite.create('');
        this.context = {};
        testsApi(this.context, this.suite);
    });

    describe('.suite method', function() {
        it('should throw an error if first argument is not a string', function() {
            (function () {
                this.context.suite(123, function() {});
            }.must.throw());
        });

        it('should throw an error if second argument is not a function', function() {
            (function() {
                this.context.suite('name');
            }.must.throw());
        });

        it('should create new suite with corresponding name', function() {
            this.context.suite('name', function() {});

            this.suite.children[0].name.must.equal('name');
        });

        it('should call callback', function() {
            var spy = sinon.spy();
            this.context.suite('name', spy);
            sinon.assert.called(spy);
        });

        it('should created nested suites when called nestedly', function() {
            var _this = this;
            this.context.suite('name', function() {
                _this.context.suite('child', function() {});
            });

            this.suite.children[0].children[0].name.must.be('child');
        });

        it('should create non-nested suite at the root level', function() {
            this.context.suite('first', function() {});
            this.context.suite('second', function() {});

            this.suite.children[1].name.must.be('second');
        });
    });

    describe('suite builder', function() {
        function testBuilderMethod(method, property, value) {
            describe(method, function() {
                it('should set ' + property + ' property', function() {
                    this.context.suite('name', function(suite) {
                        suite[method](value);
                    });

                    this.suite.children[0][property].must.equal(value);
                });

                it('should be chainable', function(done) {
                    this.context.suite('name', function(suite) {
                        suite[method](value).must.be(suite);
                        done();
                    });
                });

            });
        }

        testBuilderMethod('setUrl', 'url', 'http://example.com');
        testBuilderMethod('setElements', 'elementsSelectors', {element: 'selector'});
        testBuilderMethod('setDynamicElements', 'dynamicElementsSelectors', {element: 'selector'});

        describe('capture', function() {
            it('should create named state', function() {
                this.context.suite('name', function(suite) {
                    suite.capture('state');
                });

                this.suite.children[0].states[0].name.must.equal('state');
            });

            it('should make new state reference the suite', function() {
                this.context.suite('name', function(suite) {
                    suite.capture('state');
                });

                this.suite.children[0].states[0].suite.must.equal(this.suite.children[0]);
            });

            it('should call passed callback upon activation', function() {
                var spy = sinon.spy(),
                    browser = {
                        createActionSequence: sinon.stub().returns({
                            perform: sinon.stub()
                        })
                    };

                this.context.suite('name', function(suite) {
                    suite.capture('state', spy);
                });

                this.suite.children[0].states[0].activate(browser, {});

                sinon.assert.called(spy);

            });
        });
    });
});
