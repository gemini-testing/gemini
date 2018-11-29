'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const debug = require('debug');

const ActionsBuilder = require('./tests-api/actions-builder');
const Browser = require('./browser');
const {temp, ScreenShooter} = require('gemini-core');

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

        this._screenShooter = ScreenShooter.create(browser);
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
        return this._screenShooter.capture(page)
            .catch((e) => this.extendWithPageScreenshot(e).thenThrow(e))
            .then((image) => ({image, canHaveCaret: page.canHaveCaret}));
    }

    runPostActions() {
        return Promise.mapSeries(this._postActions.reverse(), (a) => a(this.browser));
    }

    extendWithPageScreenshot(obj) {
        const path = temp.path({suffix: '.png'});

        return this.browser.captureViewportImage()
            .then((screenImage) => [screenImage.getSize(), screenImage.save(path)])
            .spread((size) => {
                obj.img = {path, size};
            })
            .catch(_.noop)
            .then(() => obj);
    }

    serialize() {
        return {
            browser: this.browser.serialize()
        };
    }
};
