'use strict';

const NoRefImageError = require('./no-ref-image-error');
const StateError = require('./state-error');

exports.fromPlainObject = e => {
    if (e.name === 'NoRefImageError') {
        return new NoRefImageError(e.refImagePath, e.currentPath);
    }
    if (e.name === 'StateError') {
        return new StateError(e.message);
    }
    return e;
};
