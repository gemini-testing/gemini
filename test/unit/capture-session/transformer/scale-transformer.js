'use strict';

const IdentityTransformer = require('../../../../lib/capture-session/transformer/identity-transformer');
const ScaleTransformer = require('../../../../lib/capture-session/transformer/scale-transformer');

describe('ScaleTransformer', () => {
    const sandbox = sinon.sandbox.create();

    const pixelRatio = 1.5;
    const createArea = () => ({
        left: 4,
        top: 3,
        width: 2,
        height: 1
    });

    let transformer;

    beforeEach(() => {
        transformer = ScaleTransformer.create(IdentityTransformer.create(), pixelRatio);
    });

    afterEach(() => sandbox.restore());

    it('should scale to scale to the specified pixelRatio', () => {
        assert.deepEqual(transformer.transform(createArea()), {
            left: 4 * pixelRatio,
            top: 3 * pixelRatio,
            width: 2 * pixelRatio,
            height: 1 * pixelRatio
        });
    });

    it('should use results of base transformer inside', () => {
        sandbox.stub(IdentityTransformer.prototype, 'transform').returns({
            left: 10,
            top: 10,
            width: 10,
            height: 10
        });

        const result = transformer.transform(createArea());

        assert.called(IdentityTransformer.prototype.transform);
        assert.deepEqual(result, {
            left: 10 * pixelRatio,
            top: 10 * pixelRatio,
            width: 10 * pixelRatio,
            height: 10 * pixelRatio
        });
    });
});

