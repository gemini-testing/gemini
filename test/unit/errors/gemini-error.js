'use strict';

const GeminiError = require('lib/errors/gemini-error');

describe('GeminiError', function() {
    it('should include the given error message in the stacktrace', function() {
        const error = new GeminiError('MyCustomErrorMessage');

        assert.match(error.stack, /^GeminiError: MyCustomErrorMessage\n/);
    });
});
