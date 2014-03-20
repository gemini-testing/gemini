'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(plan, name, cb) {
        this.plan = plan;
        this.name = name;
        this._callback = cb;
    },

    activate: function(browser, elements) {
        var sequence = browser.createActionSequence();
        this._callback.call(null, sequence, elements);
        return sequence.perform();
    },

    getUrl: function () {
        return this.plan.url;
    },

    getElementsSelectors: function() {
        return this.plan.elements;
    },

    getDynamicElementsSelectors: function() {
        return this.plan.dynamicElements;
    }

});
