'use strict';

const CancelledError = require('lib/errors/cancelled-error');

describe('CancelledError', function() {
    it('should include the error message in the stacktrace', function() {
        const error = new CancelledError();

        assert.match(error.stack, /^CancelledError: Browser request was cancelled\n/);
    });
});
