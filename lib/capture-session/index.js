'use strict';

const inherit = require('inherit');
const _ = require('lodash');
const debug = require('debug');
const promiseUtil = require('q-promise-utils');
const ActionsBuilder = require('../tests-api/actions-builder');
const Browser = require('../browser');
const temp = require('../temp');
const StateError = require('../errors/state-error');
const Viewport = require('./viewport');
const HeightViewportError = require('./coord-validator/errors/height-viewport-error');

var CaptureSession = inherit({
    /**
     * @param {Browser} browser session instance
     * @constructor
     */
    __constructor: function(browser) {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);

        this._postActions = [];
    },

    runActions: function(actions) {
        this.log('run actions');
        return promiseUtil.sequence(actions, this.browser, new ActionsBuilder(this._postActions));
    },

    prepareScreenshot: function(state) {
        this.log('capture "%s" in %o', state.fullName, this.browser);
        return this.browser.prepareScreenshot(state.captureSelectors,
            {ignoreSelectors: state.ignoreSelectors});
    },

    capture: function(page) {
        return this.browser.captureViewportImage(page)
            .then((screenImage) => {
                const viewport = page.viewport;
                const pixelRatio = page.pixelRatio;

                return this._cropImage(Viewport.create(viewport, screenImage, pixelRatio), page);
            });
    },

    runPostActions: function() {
        return promiseUtil.sequence(this._postActions.reverse(), this.browser);
    },

    extendWithPageScreenshot: function(obj) {
        const path = temp.path({suffix: '.png'});

        return this.browser.captureViewportImage()
            .then((screenImage) => screenImage.save(path))
            .then(() => (obj.imagePath = path))
            .catch(_.noop).thenReturn(obj);
    },

    serialize: function() {
        return {
            browser: this.browser.serialize()
        };
    },

    _cropImage: function(viewport, page) {
        this.log('capture data:', page);

        const captureArea = page.captureArea;

        try {
            viewport.validate(captureArea, this.browser);
        } catch (e) {
            return e instanceof HeightViewportError && this.browser.config.compositeImage
                ? this._extendImage(viewport, page)
                : this._handleValidateImageError(e, viewport);
        }

        viewport.ignoreAreas(page.ignoreAreas);

        return viewport.crop(captureArea)
            .then((image) => ({image, canHaveCaret: page.canHaveCaret}));
    },

    _handleValidateImageError: function(e, viewport) {
        const path = temp.path({suffix: '.png'});
        const error = new StateError(e.message);

        return viewport.save(path)
            .then(() => error.imagePath = path).thenThrow(error);
    },

    _extendImage: function(viewport, page) {
        const scrollHeight = Math.min(
            viewport.getVerticalOverflow(page.captureArea),
            page.viewport.height
        );

        return this.browser
            .scrollBy(0, scrollHeight)
            .then(() => {
                page.viewport.top += scrollHeight;
                return this.browser.captureViewportImage(page);
            })
            .then((newImage) => viewport.extendBy(scrollHeight, newImage))
            .then(() => this._cropImage(viewport, page));
    }
}, {
    fromObject: function(serializedSession) {
        return Browser.fromObject(serializedSession.browser)
            .then((browser) => new CaptureSession(browser));
    }
});

module.exports = CaptureSession;
