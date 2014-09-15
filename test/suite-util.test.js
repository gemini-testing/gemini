'use strict';
var suiteUtil = require('../lib/suite-util'),
    Browser = require('../lib/browser');

describe('suite-util', function() {
    describe('shouldSkip()', function() {
        function makeBrowser(capabilities) {
            return new Browser({}, 'id', capabilities);
        }

        it('should not skip any browser if skipped=false', function() {
            suiteUtil.shouldSkip(false, makeBrowser({browserName: 'browser'})).must.be.false();
        });

        it('should skip any browser if skipped=true', function() {
            suiteUtil.shouldSkip(true, makeBrowser({browserName: 'browser'})).must.be.true();
        });

        it('should skip browser if its name and version matches skip list', function() {
            suiteUtil.shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'browser', version: '1.0'})
            ).must.be.true();
        });

        it('should not skip the browser if its name does not match skip list', function() {
            suiteUtil.shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'other browser', version: '1.0'})
            ).must.be.false();
        });

        it('should not skip browser if its version does not match skip list', function() {
            suiteUtil.shouldSkip(
                [{browserName: 'browser', version: '1.0'}],
                makeBrowser({browserName: 'browser', version: '1.1'})
            ).must.be.false();
        });

        it('should skip any browser of a given name if version is not specified in skip list', function() {
            suiteUtil.shouldSkip(
                [{browserName: 'browser'}],
                makeBrowser({browserName: 'browser', version: '1.1'})
            ).must.be.true();
        });
    });
});
