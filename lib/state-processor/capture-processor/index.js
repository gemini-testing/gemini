'use strict';

const Promise = require('bluebird');
const CaptureProcessor = require('./capture-processor');
const utils = require('./utils');
const NoRefImageError = require('../../errors/no-ref-image-error');
const temp = require('../../temp');

const throwNoRefError = (referencePath, capture) => {
    const currentPath = temp.path({suffix: '.png'});
    return capture.image.save(currentPath)
        .then(() => Promise.reject(new NoRefImageError(referencePath, currentPath)));
};
const notUpdated = (referencePath) => ({imagePath: referencePath, updated: false});

const saveRef = (referencePath, capture) => {
    return utils.saveRef(referencePath, capture)
        .then((updated) => ({imagePath: referencePath, updated}));
};

const updateRef = (referencePath, currentPath) => {
    return utils.copyImg(currentPath, referencePath)
        .then((updated) => ({imagePath: referencePath, updated}));
};

exports.create = (type) => {
    if (type === 'tester') {
        return CaptureProcessor.create()
            .onReference()
            .onNoReference(throwNoRefError)
            .onEqual((referencePath, currentPath) => ({referencePath, currentPath, equal: true}))
            .onDiff((referencePath, currentPath) => ({referencePath, currentPath, equal: false}));
    }

    if (type === 'new-updater') {
        return CaptureProcessor.create()
            .onReference(notUpdated)
            .onNoReference(saveRef);
    }

    if (type === 'diff-updater') {
        return CaptureProcessor.create()
            .onReference()
            .onNoReference(notUpdated)
            .onEqual(notUpdated)
            .onDiff(updateRef);
    }

    if (type === 'meta-updater') {
        return CaptureProcessor.create()
            .onReference()
            .onNoReference(saveRef)
            .onEqual(notUpdated)
            .onDiff(updateRef);
    }
};
