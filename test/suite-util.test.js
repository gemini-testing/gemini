'use strict';
var _ = require('lodash'),
    assert = require('chai').assert,

    Browser = require('../lib/browser'),
    suiteUtil = require('../lib/suite-util'),

    shouldSkip = suiteUtil.shouldSkip,
    flattenSuites = suiteUtil.flattenSuites;

describe('suite-util', function() {
    describe('shouldSkip()', function() {
        function makeBrowser(capabilities) {
            return new Browser({}, 'id', capabilities);
        }

        it('should not skip any browser if skipped=false', function() {
            shouldSkip(false, makeBrowser({browserName: 'browser'})).must.be.false();
        });

        it('should skip any browser if skipped=true', function() {
            shouldSkip(true, makeBrowser({browserName: 'browser'})).must.be.true();
        });

        it('should skip browser if its name and version matches skip list', function() {
            shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'browser', version: '1.0'})
            ).must.be.true();
        });

        it('should not skip the browser if its name does not match skip list', function() {
            shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'other browser', version: '1.0'})
            ).must.be.false();
        });

        it('should not skip browser if its version does not match skip list', function() {
            shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'browser', version: '1.1'})
            ).must.be.false();
        });

        it('should skip any browser of a given name if version is not specified in skip list', function() {
            shouldSkip(
                [{browserName: 'browser'}],
                makeBrowser({browserName: 'browser', version: '1.1'})
            ).must.be.true();
        });
    });

    describe('flattenSuites()', function() {
        var root;

        function addChildTo(parent) {
            var child = {};
            parent.children = (parent.children || []).concat(child);
            return child;
        }

        function addGrandNthChild(n, parent) {
            var result = addChildTo;
            while (n-- > 1) {
                result = _.compose(addChildTo, result);
            }
            return result(parent);
        }

        beforeEach(function() {
            root = {name: 'root'};
        });

        it('should return an array when root is falsey', function() {
            assert.isArray(flattenSuites());
        });

        it('should return an empty array when root is falsey', function() {
            assert.lengthOf(flattenSuites(), 0);
        });

        it('should return an array with 1 item when root has no children', function() {
            assert.lengthOf(flattenSuites(root), 1);
        });

        it('should return an array of n+1 suites for n own children', function() {
            var n = 7;
            _.times(n, _.partial(addChildTo, root));

            assert.lengthOf(flattenSuites(root), n + 1);
        });

        it('should return an array of n+1 suites for n-depth tree', function() {
            var n = 13;
            addGrandNthChild(n, root);

            assert.lengthOf(flattenSuites(root), n + 1);
        });
    });
});
