'use strict';
var State = require('../lib/state'),
    Browser = require('../lib/browser');

describe('state', function() {
    describe('shouldSkip()', function() {
        function makeBrowser(capabilities) {
            return new Browser({}, 'id', capabilities);
        }

        beforeEach(function() {
            this.suite = {skipped: false};
            this.state = new State(this.suite, 'state');
        });

        it('should not skip any browser if skipped=false', function() {
            this.state.shouldSkip(makeBrowser({browserName: 'browser'})).must.be.false();
        });

        it('should skip any browser if skipped=true', function() {
            this.suite.skipped = true;
            this.state.shouldSkip(makeBrowser({browserName: 'browser'})).must.be.true();
        });

        it('should skip browser if its name and version matches skip list', function() {
            this.suite.skipped = [
                {browserName: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip(makeBrowser({browserName: 'browser', version: '1.0'})).must.be.true();
        });

        it('should not skip the browser if its name does not match skip list', function() {
            this.suite.skipped = [
                {browserName: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip(makeBrowser({browserName: 'other browser', version: '1.0'})).must.be.false();
        });

        it('should not skip browser if its version does not match skip list', function() {
            this.suite.skipped = [
                {browserName: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip(makeBrowser({browserName: 'browser', version: '1.1'})).must.be.false();
        });

        it('should skip any browser of a given name if version is not specified in skip list', function() {
            this.suite.skipped = [
                {browserName: 'browser'}
            ];
            this.state.shouldSkip(makeBrowser({browserName: 'browser', version: '1.1'})).must.be.true();
        });
    });

    //describe('the rest of state functionality');
});
