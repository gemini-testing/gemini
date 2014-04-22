'use strict';
var Suite = require('./suite'),
    State = require('./state');

function nothing() {}

function SuiteBuilder(suite) {

    this.setElements = function setElements(elements) {
        suite.elementsSelectors = elements;
        return this;
    };

    this.setDynamicElements = function setDynamicElements(elements) {
        suite.dynamicElementsSelectors = elements;
        return this;
    };

    this.setUrl = function setUrl(url) {
        suite.url = url;
        return this;
    };

    this.capture = function capture(name, cb) {
        cb = cb || nothing;
        suite.addState(new State(this, name, cb));
        return this;
    };
}

module.exports = function(context, rootSuite) {
    context.suite = function suite(name, callback) {
        if (typeof name !== 'string') {
            throw new Error('First argument of the .suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new Error('Second argument of the .suite must be a function');
        }

        rootSuite = Suite.create(name, rootSuite);
        callback(new SuiteBuilder(rootSuite));
        rootSuite = rootSuite.parent;
    };
};
