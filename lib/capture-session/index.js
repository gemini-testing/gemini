'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug');

const ActionsBuilder = require('../tests-api/actions-builder');
const Browser = require('../browser');
const temp = require('../temp');
const StateError = require('../errors/state-error');
const Viewport = require('./viewport');
const HeightViewportError = require('./coord-validator/errors/height-viewport-error');

module.exports = class CaptureSession {
    static create(browser) {
        return new CaptureSession(browser);
    }

    static fromObject(serializedSession) {
        return Browser.fromObject(serializedSession.browser)
            .then((browser) => new CaptureSession(browser));
    }

    constructor(browser) {
        this.browser = browser;
        this.log = debug('gemini:capture:' + this.browser.id);

        this._postActions = [];
    }

    runActions(actions) {
        this.log('run actions');
        return Promise.mapSeries(actions, (a) => a(this.browser, ActionsBuilder.create(this._postActions)));
    }

    prepareScreenshot(state) {
        this.log('capture "%s" in %o', state.fullName, this.browser);
        return this.browser.prepareScreenshot(state.captureSelectors, {ignoreSelectors: state.ignoreSelectors});
    }

    capture(page) {
        return this.browser.captureViewportImage(page)
            .then((screenImage) => {
                const viewport = page.viewport;
                const pixelRatio = page.pixelRatio;

                return this._cropImage(Viewport.create(viewport, screenImage, pixelRatio), page);
            });
    }

    runPostActions() {
        return Promise.mapSeries(this._postActions.reverse(), (a) => a(this.browser));
    }

    extendWithPageScreenshot(obj) {
        const path = temp.path({suffix: '.png'});

        return this.browser.captureViewportImage()
            .then((screenImage) => screenImage.save(path))
            .then(() => (obj.imagePath = path))
            .catch(_.noop).thenReturn(obj);
    }

    serialize() {
        return {
            browser: this.browser.serialize()
        };
    }

    _cropImage(viewport, page) {
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
    }

    _handleValidateImageError(e, viewport) {
        const path = temp.path({suffix: '.png'});
        const error = new StateError(e.message);

        return viewport.save(path)
            .then(() => error.imagePath = path).thenThrow(error);
    }

    _extendImage(viewport, page) {
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
};
