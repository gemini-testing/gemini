'use strict';

var q = require('q'),
    util = require('util'),
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
        return q.all([this._wdElement.getLocation(), _this._wdElement.getSize()])
            .spread(function(pos, size) {
                return new Rect(pos.x, pos.y, size.width, size.height);
            });
    },

    isVisible: function() {
        return this._wdElement.isDisplayed();
    },

    toString: function() {
        return util.format('[object Element(selector=\'%s\')]', this.selector);
    }
});
