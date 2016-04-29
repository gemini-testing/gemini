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
});
