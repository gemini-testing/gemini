'use strict';

const StateError = require('lib/errors/state-error');

describe('StateError', function() {
    it('should include the given error message in the stacktrace', function() {
        const error = new StateError('MyCustomErrorMessage');

        assert.match(error.stack, /^StateError: MyCustomErrorMessage\n/);
    });
});
