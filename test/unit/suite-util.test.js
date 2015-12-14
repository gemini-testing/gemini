'use strict';
var _ = require('lodash'),
    suiteUtil = require('../../lib/suite-util'),

    shouldSkip = suiteUtil.shouldSkip,
    flattenSuites = suiteUtil.flattenSuites;

describe('suite-util', function() {
    describe('shouldSkip()', function() {
        it('should not skip any browser if skipped=false', function() {
            assert.isFalse(shouldSkip({skipped: false}, 'browser'));
        });

        it('should skip any browser if skipped=true', function() {
            assert.isTrue(shouldSkip({skipped: true}, 'browser'));
        });

        it('should skip browser if its id matches skip list', function() {
            var matcher = {
                    matches: _.isEqual.bind(null, 'some-browser')
                };

            assert.isTrue(shouldSkip(
                {skipped: [matcher]},
                'some-browser'
            ));
        });

        it('should not skip the browser if its id does not match skip list', function() {
            var matcher = {
                    matches: _.isEqual.bind(null, 'some-browser')
                };
            assert.isFalse(shouldSkip(
                {skipped: [matcher]},
                'another-browser'
            ));
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
