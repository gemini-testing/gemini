'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(plan) {
        this._plan = plan;
        this._states = [];
    },

    getPlanName: function() {
        return this._plan.name;
    },

    getUrl: function() {
        return this._plan.url;
    },

    getElementsSelectors: function() {
        return this._plan.elements;
    },

    getDynamicElementsSelectors: function() {
        return this._plan.dynamicElements;
    },

    addState: function(state) {
        this._states.push(state);
    },

    getStates: function() {
        return this._states;
    }

});
