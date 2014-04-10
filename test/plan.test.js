'use strict';
var Plan = require('../lib/plan');

describe('plan', function() {
    beforeEach(function() {
        this.plan = new Plan();
    });

    it('should allow to set plan name', function() {
        this.plan.setName('some name');
        this.plan.name.must.be('some name');
    });

    describe('suites', function() {
        it('should have only root suite by default', function() {
            this.plan.suites.length.must.be(1);
        });
    });

    describe('suite builder methods:', function() {
        beforeEach(function() {
            this.rootGroup = this.plan.suites[0];
        });

        function testGroupBuilderMethod(method, property, value) {
            describe(method, function() {
                it('should change current suite ' + property, function() {
                    this.plan[method](value);
                    this.rootGroup[property].must.be(value);
                });
            });
        }

        testGroupBuilderMethod('setUrl', 'url', 'http://example.com');
        testGroupBuilderMethod('setElements', 'elementsSelectors', {name: 'selector'});
        testGroupBuilderMethod('setDynamicElements', 'dynamicElementsSelectors', {name: 'selector'});

        describe('capture', function() {
            it('should add new state to the current suite', function() {
                this.plan.capture('state');
                this.rootGroup.states[0].name.must.be('state');
            });
        });

    });

    describe('suite', function() {
        it('should create a new suite', function() {
            this.plan.suite();
            this.plan.suites.length.must.be(2);
        });

        it('should create a named suite', function() {
            this.plan.suite('new suite');
            this.plan.suites[1].name.must.be('new suite');
        });

        describe('inheritance', function() {
            /*jshint maxparams:4*/
            function testInheritance(method, property, parentVal, childVar) {
                it('should inherit ' + property + ' from root', function() {
                    this.plan[method](parentVal)
                        .suite('new suite');

                    this.plan.suites[1][property].must.be(parentVal);
                });

                it('should allow overwrite ' + property, function() {
                    this.plan[method](parentVal)
                        .suite('new suite')
                        [method](childVar);

                    this.plan.suites[1][property].must.be(childVar);
                });
            }


            testInheritance('setUrl', 'url', 'http://example.com', 'http://example2.com');
            testInheritance('setElements', 'elementsSelectors', {name: 'selector'}, {name: 'selector2'});
            testInheritance('setDynamicElements', 'dynamicElementsSelectors', {name: 'selector'}, {name: 'selector2'});

            it('should not inherit states', function() {
                this.plan
                    .capture('some state')
                    .suite('new suite');

                this.plan.suites[1].states.length.must.be(0);
            });
               
        });


    });
});
