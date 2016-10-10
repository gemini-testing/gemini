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

const CaptureSession = inherit({
    /**
     * @param {Browser} browser session instance
     * @constructor
     */
    __constructor: (browser) => {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);

        this._postActions = [];
    },

    runActions: (actions) => {
        this.log('run actions');
        return promiseUtil.sequence(actions, this.browser, new ActionsBuilder(this._postActions));
    },

    prepareScreenshot: (state, opts) => {
        opts = _.extend({}, opts, {
            ignoreSelectors: state.ignoreSelectors
        });

        this.log('capture "%s" in %o', state.fullName, this.browser);
        return this.browser.prepareScreenshot(state.captureSelectors, opts);
    },

    capture: (page) =>
        this.browser.captureViewportImage(page)
            .then((screenImage) => {
                const viewport = page.viewport;
                const pixelRatio = page.pixelRatio;

                return this._cropImage(Viewport.create(viewport, screenImage, pixelRatio), page);
            }),

    runPostActions: () => promiseUtil.sequence(this._postActions.reverse(), this.browser),

    extendWithPageScreenshot: (obj) => {
        const path = temp.path({suffix: '.png'});

        return this.browser.captureViewportImage()
            .then((screenImage) => screenImage.save(path))
            .then(() => obj.imagePath = path)
            .catch(_.noop).thenReturn(obj);
    },

    serialize: () => ({
        browser: this.browser.serialize()
    }),

    _cropImage: (viewport, page) => {
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

    _handleValidateImageError: (e, viewport) => {
        const path = temp.path({suffix: '.png'});
        const error = new StateError(e.message);

        return viewport.save(path)
            .then(() => error.imagePath = path).thenThrow(error);
    },

    _extendImage: (viewport, page) => {
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
    fromObject: (serializedSession) =>
        Browser.fromObject(serializedSession.browser)
            .then((browser) => new CaptureSession(browser))
});

module.exports = CaptureSession;
