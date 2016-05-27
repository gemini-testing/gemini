'use strict';

const q = require('q');
const _ = require('lodash');

const temp = require('../../../lib/temp');
const Image = require('../../../lib/image');
const StateError = require('../../../lib/errors/state-error');
const CoordValidator = require('../../../lib/capture-session/coord-validator');

describe('CoordValidator', () => {
    const sandbox = sinon.sandbox.create();

    let coordValidator;

    function validate_(areaModification) {
        const imageSize = {
            width: 10, height: 10
        };

        areaModification = _.defaults(areaModification || {}, {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        });

        const cropArea = {
            left: areaModification.left,
            top: areaModification.top,
            width: imageSize.width + areaModification.width,
            height: imageSize.height + areaModification.height
        };

        Image.prototype.getSize.returns(imageSize);

        return coordValidator.validate(new Image(), cropArea);
    }

    beforeEach(() => {
        sandbox.stub(Image.prototype);
        Image.prototype.save.returns(q());

        sandbox.stub(temp, 'path').returns('/path/to/img');

        coordValidator = new CoordValidator({id: 'some-browser-id'});
    });

    afterEach(() => sandbox.restore());

    describe('validation failed', () => {
        it('if crop area left boundary is outside of image', () => {
            return assert.isRejected(validate_({left: -1}), StateError);
        });

        it('if crop area top boundary is outside of image', () => {
            return assert.isRejected(validate_({top: -1}), StateError);
        });

        it('if crop area right boundary is outside of image', () => {
            return assert.isRejected(validate_({width: +1}), StateError);
        });

        it('if crop area bottom boundary is outside of image', () => {
            return assert.isRejected(validate_({height: +1}), StateError);
        });
    });

    it('should be resolved on passed validation', () => {
        return assert.isFulfilled(validate_({left: 0}));
    });
});
