'use strict';

function createElementFinder(selector, syntax) {
    if (typeof selector !== 'string') {
        throw new Error('find argument should be a string');
    }

    return Object.create(null, {
        _selector: {
            value: selector,
            enumerable: false,
            writable: false
        },
        _syntax: {
            value: syntax,
            enumerable: false,
            writable: false
        }
    });
}

exports.find = Object.assign(
    (selector) => createElementFinder(selector, 'css'),
    ['css', 'link', 'xpath']
        .reduce((o, syntax) => Object.assign(o, {[syntax]: selector => createElementFinder(selector, syntax)}), {})
);
