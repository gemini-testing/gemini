'use strict';

var path = require('path'),
    q = require('q'),
    inherit = require('inherit');

function nothing() {
    return q.resolve();
}

var Plan = module.exports = inherit({
    __constructor: function() {
        this._states = {};
    },

    setName: function setName(name) {
        this.name = name;
        return this;
    },

    setElements: function setElement(elements) {
        this.elements = elements;
        return this;
    },

    setUrl: function setUrl(newUrl) {
        this.url = newUrl;
        return this;
    },

    addState: function state(name, cb) {
        cb = cb || nothing;
        this._states[name] = cb;
        return this;
    },

    getStates: function getStates() {
        return Object.keys(this._states);
    },

    toState: function toState(name, actions, elements) {
        return this._states[name].call(this, actions, elements);
    }

}, {
    read: function(file) {
        var plan = new Plan();
        require(path.resolve(file))(plan);
        return plan;
    }
});
