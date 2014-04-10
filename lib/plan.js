'use strict';

var path = require('path'),
    q = require('q'),
    inherit = require('inherit'),
    suite = require('./suite'),
    State = require('./state');

function nothing() {
    return q.resolve();
}

var Plan = module.exports = inherit({
    __constructor: function() {
        this._suite = this._rootSuite = suite.create('');
        this._suites = [
            this._rootSuite
        ];
    },

    setName: function setName(name) {
        this.name = name;
        return this;
    },

    setElements: function setElement(elements) {
        this._suite.elementsSelectors = elements;
        return this;
    },

    setDynamicElements: function setDynamicElements(elements) {
        this._suite.dynamicElementsSelectors = elements;
        return this;
    },

    setUrl: function setUrl(newUrl) {
        this._suite.url = newUrl;
        return this;
    },

    suite: function(name) {
        this._suite = suite.create(name, this._rootSuite);
        this._suites.push(this._suite);
        return this;
    },

    capture: function capture(name, cb) {
        cb = cb || nothing;
        this._suite.addState(new State(this, name, cb));
        return this;
    },

    get suites() {
        return this._suites;
    }

}, {
    read: function(file) {
        var plan = new Plan();
        require(path.resolve(file))(plan);
        return plan;
    }
});
