'use strict';

const NoRefImageError = require('lib/errors/no-ref-image-error');

describe('NoRefImageError', () => {
    it('should include the error message in the stacktrace', () => {
        const error = new NoRefImageError({path: 'anyPath'});

        assert.match(error.stack, /^NoRefImageError: Can not find reference image at anyPath.\n/);
    });
});
