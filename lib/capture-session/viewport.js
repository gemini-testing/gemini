'use strict';

const _ = require('lodash');

const CoordValidator = require('./coord-validator');

module.exports = class Viewport {
    static create(viewport, image, pixelRatio) {
        return new Viewport(viewport, image, pixelRatio);
    }

    constructor(viewport, image, pixelRatio) {
        this._viewport = _.clone(viewport);
        this._image = image;
        this._pixelRatio = pixelRatio;
    }

    validate(captureArea, browser) {
        CoordValidator.create(browser).validate(this._viewport, captureArea);
    }

    ignoreAreas(areas) {
        areas.forEach((area) => {
            this._image.clear(this._transformToViewportOrigin(area), {scaleFactor: this._pixelRatio});
        });
    }

    crop(captureArea) {
        return this._image.crop(this._transformToViewportOrigin(captureArea), {scaleFactor: this._pixelRatio});
    }

    _transformToViewportOrigin(area) {
        return _.extend({}, area, {
            top: area.top - this._viewport.top,
            left: area.left - this._viewport.left
        });
    }

    save(path) {
        return this._image.save(path);
    }

    extendBy(scrollHeight, newImage) {
        const newImageSize = newImage.getSize();
        const physicalScrollHeight = scrollHeight * this._pixelRatio;

        this._viewport.height += scrollHeight;

        return newImage.crop({
                left: 0,
                top: newImageSize.height - physicalScrollHeight,
                width: newImageSize.width,
                height: physicalScrollHeight
            })
            .then((croppedImage) => this._image.join(croppedImage));
    }

    getVerticalOverflow(captureArea) {
        return captureArea.height - this._viewport.height;
    }
};
