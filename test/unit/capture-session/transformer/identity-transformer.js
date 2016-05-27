'use strict';

const IdentityTransformer = require('../../../../lib/capture-session/transformer/identity-transformer');

describe('IdentityTransformer', () => {
    it('should return original area', () => {
        const area = {
            left: 1,
            top: 2,
            width: 3,
            height: 4
        };

        const transformer = IdentityTransformer.create();
        assert.deepEqual(transformer.transform(area), area);
    });
});
