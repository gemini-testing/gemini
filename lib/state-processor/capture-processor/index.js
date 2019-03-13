'use strict';

const Promise = require('bluebird');
const CaptureProcessor = require('./capture-processor');
const utils = require('./utils');
const NoRefImageError = require('../../errors/no-ref-image-error');
const {temp} = require('gemini-core');

const throwNoRefError = (refImg, capture) => {
    const currImg = {path: temp.path({suffix: '.png'}), size: capture.image.getSize()};

    return capture.image.save(currImg.path)
        .then(() => Promise.reject(new NoRefImageError(refImg, currImg)));
};
const notUpdated = (refImg) => ({refImg, updated: false});

const saveRef = (refImg, capture) => {
    refImg.size = capture.image.getSize();

    return utils.saveRef(refImg.path, capture)
        .then((updated) => ({refImg, updated}));
};

const updateRef = (refImg, currImg) => {
    return utils.copyImg(currImg.path, refImg.path)
        .then((updated) => {
            if (updated) {
                refImg.size = currImg.size;
            }

            return {refImg, updated};
        });
};

exports.create = (type) => {
    if (type === 'tester') {
        return CaptureProcessor.create()
            .onReference()
            .onNoReference(throwNoRefError)
            .onEqual((refImg, currImg) => ({refImg, currImg, equal: true}))
            .onDiff((refImg, currImg, {diffBounds, diffClusters}) => ({refImg, currImg, diffBounds, diffClusters, equal: false}));
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
