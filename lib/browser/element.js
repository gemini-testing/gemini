'use strict';

var util = require('util'),
    inherit = require('inherit'),
    Rect = require('../geometery/rect');

module.exports = inherit({
    __constructor: function(selector, wdElement) {
        this.selector = selector;
        this._wdElement = wdElement;
    },

    getComputedCss: function(property) {
        return this._wdElement.getComputedCss(property);
    },

    getClientRect: function() {
        var _this = this;
        return this._wdElement.getLocation()
            .then(function(pos) {
                return _this._wdElement.getSize().then(function(size) {
                    return new Rect(pos.x, pos.y, size.width, size.height);
                });
            });
    },

    isVisible: function() {
        return this._wdElement.isDisplayed();
    },

    toString: function() {
        return util.format('[object Element(selector=\'%s\')]', this.selector);
    }
});
