'use strict';

var Actions = require('./actions'),
    inherit = require('inherit');

var SmartActions = inherit(Actions, {
    __constructor: function(browser) {
        this.__base(browser);
        this._postActions = new Actions(browser);
    },

    getPostActions: function() {
        return this._postActions._actions.length > 0 && this._postActions;
    },

    setWindowSize: function(width, height) {
        var _this = this;
        this._pushAction(this.setWindowSize, function setWindowSize() {
            return _this._driver.getWindowSize()
                .then(function(size) {
                    if (size.width !== width || size.height !== height) {
                        _this._postActions.setWindowSize(size.width, size.height);
                    }
                    return _this._driver.setWindowSize(width, height);
                });
        });

        return this;
    }
});

module.exports = SmartActions;
