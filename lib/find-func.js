'use strict';

exports.find = function(selector) {
    if (typeof selector !== 'string') {
        throw new Error('find argument should be a string');
    }

    return Object.create(null, {
        _selector: {
            value: selector,
            enumerable: false,
            writable: false
        }
    });
};
