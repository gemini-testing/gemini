'use strict';

const _ = require('lodash');

const CoordValidator = require('lib/capture-session/coord-validator');
const HeightViewportError = require('lib/capture-session/coord-validator/errors/height-viewport-error');
const OffsetViewportError = require('lib/capture-session/coord-validator/errors/offset-viewport-error');

describe('CoordValidator', () => {
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

        const captureArea = {
            left: areaModification.left,
            top: areaModification.top,
            width: viewport.width + areaModification.width,
            height: viewport.height + areaModification.height
        };

        return coordValidator.validate(viewport, captureArea);
    }

    beforeEach(() => {
        coordValidator = new CoordValidator({id: 'some-browser-id'});
    });

    describe('validation failed', () => {
        it('if crop area left boundary is outside of viewport', () => {
            assert.throws(() => validate_({left: -1}), OffsetViewportError);
        });

        it('if crop area top boundary is outside of viewport', () => {
            assert.throws(() => validate_({top: -1}), OffsetViewportError);
        });

        it('if crop area right boundary is outside of viewport', () => {
            assert.throws(() => validate_({width: +1}), OffsetViewportError);
        });

        it('if crop area height bigger than viewport height', () => {
            assert.throws(() => validate_({height: +1}), HeightViewportError);
        });
    });

    it('should not throw on passed validation', () => {
        const fn = () => validate_({left: 0});

        return assert.doesNotThrow(fn);
    });
});
