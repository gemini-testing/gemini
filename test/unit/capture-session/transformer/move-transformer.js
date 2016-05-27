'use strict';

const _ = require('lodash');

const IdentityTransformer = require('../../../../lib/capture-session/transformer/identity-transformer');
const MoveTransformer = require('../../../../lib/capture-session/transformer/move-transformer');

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
        return MoveTransformer.create(IdentityTransformer.create(), offset);
    }

    afterEach(() => sandbox.restore());

    it('should substract configured offset values', () => {
        const offset = {left: 2, top: 1};
        const result = mkTransformer_(offset).transform(mkArea_({left: 4, top: 3}));

        assert.propertyVal(result, 'left', 4 - 2);
        assert.propertyVal(result, 'top', 3 - 1);
    });

    it('should use results of base transformer inside', () => {
        const area = mkArea_({
            left: 10,
            top: 10,
            width: 10,
            height: 10
        });
        sandbox.stub(IdentityTransformer.prototype, 'transform').returns(area);

        const offset = {left: 2, top: 1};
        const result = mkTransformer_(offset).transform(mkArea_());

        assert.called(IdentityTransformer.prototype.transform);
        assert.deepEqual(result, {
            left: area.left - 2,
            top: area.top - 1,
            width: area.width,
            height: area.height
        });
    });
});
