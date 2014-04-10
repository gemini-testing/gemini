'use strict';

var inherit = require('inherit');

function defineStates(object) {
    Object.defineProperty(object, '_states', {
        writable: false,
        enumerable: false,
        value: []
    });
}

var Suite = inherit({

    __constructor: function(plan) {

        this.name = null;
        this.elementsSelectors = null;
        this.dynamicElementsSelectors = null;
        this.url = null;
        this.plan = plan;
        defineStates(this);
    },

    addState: function(state) {
        this._states.push(state);
    },

    get states() {
        return this._states;
    },

    hasStates: function() {
        return this.getStates().length > 0;
    }

});

exports.create = function createGroup(name, parent) {
    var suite;
    if (parent) {
        suite = Object.create(parent);
        defineStates(suite);
    } else {
        suite = new Suite();
    }
    suite.name = name;
    return suite;
};
