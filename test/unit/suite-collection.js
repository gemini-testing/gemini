'use strict';

var SuiteCollection = require('../../lib/suite-collection'),
    util = require('../util');

describe('suite-collection', function() {
    describe('topLevelSuites', function() {
        it('should return empty list on empty collection', function() {
            var collection = new SuiteCollection();
            assert.deepEqual([], collection.topLevelSuites());
        });

        it('should return all suites from collection', function() {
            var collection = new SuiteCollection(),
                suite1 = util.makeSuiteStub(),
                suite2 = util.makeSuiteStub();

            collection
                .add(suite1)
                .add(suite2);

            assert.deepEqual(
                [suite1, suite2],
                collection.topLevelSuites()
            );
        });

        it('should return only top level suites', function() {
            var collection = new SuiteCollection(),
                child = util.makeSuiteStub(),
                suite = util.makeSuiteStub({children: [child]});

            collection.add(suite);

            assert.deepEqual(
                [suite],
                collection.topLevelSuites()
            );
        });
    });

    describe('allSuites', function() {
        it('should return empty list on empty collection', function() {
            var collection = new SuiteCollection();
            assert.deepEqual([], collection.allSuites());
        });

        it('should return all suites including children', function() {
            var collection = new SuiteCollection(),
                grandchild1 = util.makeSuiteStub(),
                grandchild2 = util.makeSuiteStub(),
                child = util.makeSuiteStub({children: [grandchild1, grandchild2]}),
                suite = util.makeSuiteStub({children: [child]});

            collection.add(suite);

            assert.deepEqual(
                [suite, child, grandchild1, grandchild2],
                collection.allSuites()
            );
        });
    });
});
