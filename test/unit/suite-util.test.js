'use strict';
var _ = require('lodash'),
    suiteUtil = require('../../lib/suite-util'),
    shouldSkip = suiteUtil.shouldSkip;

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
});
