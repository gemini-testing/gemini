'use strict';

var Actions = require('./actions'),
    inherit = require('inherit');

var SmartActions = inherit(Actions, {
    __constructor: function() {
        this.__base();
        this._postActions = new Actions();
    },

    getPostActions: function() {
        return this._postActions._actions.length > 0 && this._postActions;
    },

    setWindowSize: function(width, height) {
        var postActions = this._postActions;

        this._pushAction(this.setWindowSize, function setWindowSize(browser) {
            return browser._browser.getWindowSize()
                .then(function(size) {
                    if (size.width !== width || size.height !== height) {
                        postActions.setWindowSize(size.width, size.height);
                    }
                    return browser._browser.setWindowSize(width, height);
                });
        });

        return this;
    }
});

module.exports = SmartActions;
