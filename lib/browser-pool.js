'use strict';

const {BrowserPool, Calibrator} = require('gemini-core');
const Browser = require('./browser');
const Events = require('./constants/events');

exports.create = function(config, emitter) {
    const calibrator = new Calibrator();

    const BrowserManager = {
        create: (id) => Browser.create(config.forBrowser(id)),

        start: (browser) => browser.launch(calibrator),
        onStart: (browser) => emitter.emitAndWait(Events.START_BROWSER, browser),

        onQuit: (browser) => emitter.emitAndWait(Events.STOP_BROWSER, browser),
        quit: (browser) => browser.quit()
    };

    const configAdapter = {
        forBrowser: (id) => {
            const browserConfig = config.forBrowser(id);
            return {
                parallelLimit: browserConfig.sessionsPerBrowser,
                sessionUseLimit: browserConfig.suitesPerSession
            };
        },

        getBrowserIds: () => config.getBrowserIds(),

        get system() {
            return config.system;
        }
    };

    return BrowserPool.create(BrowserManager, {
        logNamespace: 'gemini',
        config: configAdapter
    });
};
