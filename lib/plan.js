'use strict';

var path = require('path'),
    q = require('q'),
    inherit = require('inherit'),
    StateChain = require('./state-chain'),
    State = require('./state');

function nothing() {
    return q.resolve();
}

var Plan = module.exports = inherit({
    __constructor: function() {
        this.dynamicElements = {};
        this._chains = [];
        this._nextChain();
    },

    setName: function setName(name) {
        this.name = name;
        return this;
    },

    setElements: function setElement(elements) {
        this.elements = elements;
        return this;
    },

    setDynamicElements: function setDynamicElements(elements) {
        this.dynamicElements = elements;
        return this;
    },

    setUrl: function setUrl(newUrl) {
        this.url = newUrl;
        return this;
    },

    reload: function reload() {
        this._nextChain();
        return this;
    },

    capture: function capture(name, cb) {
        cb = cb || nothing;
        this._currentChain.addState(new State(this, name, cb));
        return this;
    },

    getChains: function getStates() {
        return this._chains;
    },

    _nextChain: function() {
        this._currentChain = new StateChain(this);
        this._chains.push(this._currentChain);
    }
}, {
    read: function(file) {
        var plan = new Plan();
        require(path.resolve(file))(plan);
        return plan;
    }
});
