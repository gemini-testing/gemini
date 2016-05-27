'use strict';

const _ = require('lodash');

const CoordValidator = require('../../../lib/capture-session/coord-validator');

describe('CoordValidator', () => {
    const sandbox = sinon.sandbox.create();

    let coordValidator;

    function validate_(areaModification) {
        const viewport = {
            width: 10,
            height: 10
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
            width: viewport.width + areaModification.width,
            height: viewport.height + areaModification.height
        };

        return coordValidator.validate(viewport, cropArea);
    }

    beforeEach(() => {
        coordValidator = new CoordValidator({id: 'some-browser-id'});
    });

    afterEach(() => sandbox.restore());

    describe('validation failed', () => {
        it('if crop area left boundary is outside of image', () => {
            return assert.propertyVal(validate_({left: -1}), 'failed', true);
        });

        it('if crop area top boundary is outside of image', () => {
            return assert.propertyVal(validate_({top: -1}), 'failed', true);
        });

        it('if crop area right boundary is outside of image', () => {
            return assert.propertyVal(validate_({width: +1}), 'failed', true);
        });

        it('if crop area bottom boundary is outside of image', () => {
            return assert.propertyVal(validate_({height: +1}), 'failed', true);
        });

        it('should attach non-empty error message', () => {
            const validation = validate_({left: -1});
            assert.isString(validation.message);
            assert.isAbove(validation.message.length, 0);
        });
    });

    it('should return non-failed result on passed validation', () => {
        return assert.propertyVal(validate_({left: 0}), 'failed', false);
    });
});
