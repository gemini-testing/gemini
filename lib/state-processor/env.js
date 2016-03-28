'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(state, browserSession) {
        this._state = state;
        this._browser = browserSession.browser;
    },

    get tolerance() {
        var tolerance = this._state.tolerance;

        return tolerance || tolerance === 0
            ? tolerance
            : this._browser.config.tolerance;
    },

    get refPath() {
        return this._browser.config.getScreenshotPath(
            this._state.suite, this._state.name);
    },

    get refsDir() {
        return this._browser.config.getScreenshotsDir(
            this._state.suite, this._state.name);
    }
});
