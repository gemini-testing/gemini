'use strict';

const fs = require('fs-extra');
const path = require('path');

exports.copyImg = (currPath, refPath) => fs.copyAsync(currPath, refPath)
    .then(() => true)
    .catch(() => false);

exports.saveRef = (refPath, capture) => {
    return fs.mkdirsAsync(path.dirname(refPath))
        .then(() => capture.image.save(refPath))
        .then(() => true)
        .catch(() => false);
};

exports.existsRef = (refPath) => fs.accessAsync(refPath)
    .then(() => true)
    .catch(() => false);
