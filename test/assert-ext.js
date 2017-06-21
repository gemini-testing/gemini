'use strict';

global.assert.calledOnceWith = function() {
    assert.calledOnce(arguments[0]);
    assert.calledWith.apply(null, arguments);
};
