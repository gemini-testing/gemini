'use strict';

const NoRefImageError = require('lib/errors/no-ref-image-error');

describe('NoRefImageError', function() {
    it('should include the error message in the stacktrace', function() {
        const error = new NoRefImageError('anyPath');

        assert.match(error.stack, /^NoRefImageError: Can not find reference image at anyPath.\n/);
    });
});
