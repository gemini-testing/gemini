'use strict';

const inherit = require('inherit');
const _ = require('lodash');
const debug = require('debug');
const promiseUtil = require('q-promise-utils');
const ActionsBuilder = require('../tests-api/actions-builder');
const Browser = require('../browser');
const temp = require('../temp');
const StateError = require('../errors/state-error');
const MoveTransformer = require('./move-transformer');
const CoordValidator = require('./coord-validator');

var CaptureSession = inherit({
    /**
     * @param {Browser} browser session instance
     * @constructor
     */
    __constructor: function(browser) {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);

        this._coordValidator = new CoordValidator(browser);
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
        return this.browser.captureFullscreenImage(pageDisposition)
            .then((screenImage) => this._cropImage(screenImage, pageDisposition));
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

    _cropImage: function(screenImage, pageDisposition) {
        this.log('capture data:', pageDisposition);

        const pixelRatio = pageDisposition.pixelRatio;
        const transformer = MoveTransformer.create(pageDisposition.viewport);
        const cropArea = transformer.transform(pageDisposition.captureArea);

        const validation = this._coordValidator.validate(pageDisposition.viewport, cropArea);

        if (validation.failed) {
            const path = temp.path({suffix: '.png'});
            const error = new StateError(validation.message);

            return screenImage.save(path)
                .then(() => error.imagePath = path)
                .thenReject(error);
        }

        pageDisposition.ignoreAreas.forEach((area) => {
            return screenImage.clear(transformer.transform(area), {scaleFactor: pixelRatio});
        });

        return screenImage.crop(cropArea, {scaleFactor: pixelRatio})
            .then(crop => ({
                image: crop,
                canHaveCaret: pageDisposition.canHaveCaret
            }));
    }
}, {
    fromObject: function(serializedSession) {
        return Browser.fromObject(serializedSession.browser)
            .then((browser) => new CaptureSession(browser));
    }
});

module.exports = CaptureSession;
