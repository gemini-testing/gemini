'use strict';

const inherit = require('inherit');
const _ = require('lodash');
const debug = require('debug');
const promiseUtil = require('q-promise-utils');
const ActionsBuilder = require('../tests-api/actions-builder');
const Browser = require('../browser');
const temp = require('../temp');
const StateError = require('../errors/state-error');
const CoordTransformer = require('./transformer');
const CoordValidator = require('./coord-validator');
const HeightOutsideImageError = require('../errors/height-outside-image-error');

var CaptureSession = inherit({
    /**
     * @param {Browser} browser session instance
     * @constructor
     */
    __constructor: function(browser) {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);

        this._coordValidator = new CoordValidator(browser);
        this._coordTransformer = new CoordTransformer(browser);
        this._postActions = [];
    },

    runActions: function(actions) {
        this.log('run actions');
        return promiseUtil.sequence(actions, this.browser, new ActionsBuilder(this._postActions));
    },

    prepareScreenshot: function(state, opts) {
        opts = _.extend({}, opts, {
            ignoreSelectors: state.ignoreSelectors
        });

        this.log('capture "%s" in %o', state.fullName, this.browser);
        return this.browser.prepareScreenshot(state.captureSelectors, opts);
    },

    capture: function(pageDisposition) {
        return this.browser.captureFullscreenImage()
            .then((screenImage) => this._transformCoordinates(screenImage, pageDisposition))
            .spread(this._cropImage.bind(this));
    },

    runPostActions: function() {
        return promiseUtil.sequence(this._postActions.reverse(), this.browser);
    },

    extendWithPageScreenshot: function(obj) {
        const path = temp.path({suffix: '.png'});

        return this.browser.captureFullscreenImage()
            .then((screenImage) => screenImage.save(path))
            .then(() => (obj.imagePath = path))
            .catch(_.noop)
            .thenResolve(obj);
    },

    serialize: function() {
        return {
            browser: this.browser.serialize()
        };
    },

    _transformCoordinates: function(screenImage, pageDisposition) {
        const transformer = this._coordTransformer.create(screenImage, pageDisposition);
        const cropArea = transformer.transform(pageDisposition.captureArea);

        return [screenImage, pageDisposition, cropArea, transformer];
    },

    _cropImage: function(screenImage, pageDisposition, cropArea, transformer) {
        this.log('capture data:', pageDisposition);

        try {
            this._coordValidator.validate(pageDisposition.viewport, cropArea);
        } catch (e) {
            if (e instanceof HeightOutsideImageError) {
                return this._extendImage(screenImage, pageDisposition, cropArea);
            }

            return handleOffsetImageError(e, screenImage);
        }

        pageDisposition.ignoreAreas.forEach(area => screenImage.clear(transformer.transform(area)));

        return screenImage.crop(cropArea)
            .then(crop => ({
                image: crop,
                canHaveCaret: pageDisposition.canHaveCaret
            }));

        function handleOffsetImageError(e, screenImage) {
            const path = temp.path({suffix: '.png'});
            const error = new StateError(e.message);

            return screenImage.save(path)
                .then(() => error.imagePath = path)
                .thenReject(error);
        }
    },

    _extendImage: function(screenImage, pageDisposition, cropArea) {
        const viewport = pageDisposition.viewport;
        const maxScrollHeight = pageDisposition.maxScrollHeight || (pageDisposition.maxScrollHeight = viewport.height);
        let outsideHeight = cropArea.height - viewport.height;

        if (outsideHeight > maxScrollHeight) {
            outsideHeight = maxScrollHeight;
        }

        return this.browser
            .scroll(0, outsideHeight)
            .then(() => this.browser.captureFullscreenImage())
            .then((newImage) => {
                return newImage.crop({
                        left: 0,
                        top: newImage.getSize().height - outsideHeight,
                        width: screenImage.getSize().width,
                        height: outsideHeight
                    });
            })
            .then((croppedImage) => screenImage.join(croppedImage))
            .then((joinedImage) => {
                pageDisposition.viewport.height += outsideHeight;

                return this._cropImage(joinedImage, pageDisposition, cropArea);
            });
    }
}, {
    fromObject: function(serializedSession) {
        return Browser.fromObject(serializedSession.browser)
            .then((browser) => new CaptureSession(browser));
    }
});

module.exports = CaptureSession;
