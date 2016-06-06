'use strict';

const _ = require('lodash');

const MoveTransformer = require('../../../lib/capture-session/move-transformer');

describe('MoveTransformer', () => {
    const sandbox = sinon.sandbox.create();

    function mkArea_(area) {
        return _.defaults(area || {}, {
            left: 4,
            top: 3,
            width: 2,
            height: 1
        });
    }

    function mkTransformer_(offset) {
        return MoveTransformer.create(offset);
    }

    afterEach(() => sandbox.restore());

    it('should substract configured offset values', () => {
        const offset = {left: 2, top: 1};
        const result = mkTransformer_(offset).transform(mkArea_({left: 4, top: 3}));

        assert.propertyVal(result, 'left', 4 - 2);
        assert.propertyVal(result, 'top', 3 - 1);
    });
});
