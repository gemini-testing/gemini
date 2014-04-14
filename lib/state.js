'use strict';

var q = require('q'),
    inherit = require('inherit'),

    StateError = require('./errors/state-error');

module.exports = inherit({
    __constructor: function(plan, name, cb) {
        this.plan = plan;
        this.name = name;
        this._callback = cb;
    },

    activate: function(browser, elements) {
        var sequence = browser.createActionSequence();

        try {
            this._callback.call(null, sequence, elements);
        } catch(e) {
            return q.reject(new StateError('Error while executing callback', {
                planName: this.plan.name,
                stateName: this.name,
                browserName: browser.fullName
            }, e));
        }

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
