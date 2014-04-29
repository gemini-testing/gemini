'use strict';
var State = require('../lib/state');

describe('state', function() {

    describe('shouldSkip()', function() {
        beforeEach(function() {
            this.suite = {
                skipped: false
            };
            this.state = new State(this.suite, 'state');
        });

        it('should not skip any browser if skipped=false', function() {
            this.state.shouldSkip({name: 'browser'}).must.be.false();
        });

        it('should skip any browser if skipped=true', function() {
            this.suite.skipped = true;
            this.state.shouldSkip({name: 'browser'}).must.be.true();
        });

        it('should skip browser if its name and version matches skip list', function() {
            this.suite.skipped = [
                {name: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip({name: 'browser', version: '1.0'}).must.be.true();
        });

        it('should not skip the browser if its name does not match skip list', function() {
            this.suite.skipped = [
                {name: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip({name: 'other browser', version: '1.0'}).must.be.false();
        });

        it('should not skip browser if its version does not match skip list', function() {
            this.suite.skipped = [
                {name: 'browser', version: '1.0'}
            ];

            this.state.shouldSkip({name: 'browser', version: '1.1'}).must.be.false();
        });

        it('should skip any browser of a given name if version is not specified in skip list', function() {
            this.suite.skipped = [
                {name: 'browser'}
            ];
            this.state.shouldSkip({name: 'browser', version: '1.1'}).must.be.true();
        });
    });

    //describe('the rest of state functionality');

});
