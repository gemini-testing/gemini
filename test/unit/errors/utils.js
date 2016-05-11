'use strict';

const errorUtils = require('../../../lib/errors/utils');
const NoRefImageError = require('../../../lib/errors/no-ref-image-error');
const StateError = require('../../../lib/errors/state-error');

describe('errors utils', () => {
    describe('fromPlainObject', () => {
        it('should not modify error object by default', () => {
            let obj = {some: 'value'};

            let error = errorUtils.fromPlainObject(obj);

            assert.deepEqual(error, obj);
        });

        it('should handle NoRefImageError', () => {
            let obj = {name: 'NoRefImageError'};

            let error = errorUtils.fromPlainObject(obj);

            assert.instanceOf(error, NoRefImageError);
        });

        it('should handle StateError', () => {
            let obj = {name: 'StateError'};

            let error = errorUtils.fromPlainObject(obj);

            assert.instanceOf(error, StateError);
        });
    });

    describe('cloneError', () => {
        it('should clone an error', () => {
            const err = new Error();
            const cloned = errorUtils.cloneError(err);

            cloned.key = 'value';

            assert.instanceOf(cloned, Error);
            assert.notProperty(err, 'key');
        });

        it('should clone an error with its message', () => {
            const err = new Error('some-message');
            const cloned = errorUtils.cloneError(err);

            assert.equal(cloned.message, 'some-message');
        });

        it('should clone an error with its properties', () => {
            const err = new Error();
            err.key = 'value';

            const cloned = errorUtils.cloneError(err);
            assert.equal(cloned.key, 'value');
        });
    });
});
