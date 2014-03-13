'use strict';

var inherit = require('inherit');

module.exports = inherit({
    __constructor: function(plan) {
        this._plan = plan;
        this._states = [];
    },

    getUrl: function() {
        return this._plan.url;
    },

    getElementsSelectors: function() {
        return this._plan.elements;
    },

    addState: function(state) {
        this._states.push(state);
    },

    getStates: function() {
        return this._states;
    }

});
