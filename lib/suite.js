'use strict';

var inherit = require('inherit'),
    _ = require('lodash');

function definePrivate(suite) {
    Object.defineProperty(suite, '_states', {
        value: []
    });

    Object.defineProperty(suite, '_children', {
        value: []
    });
}

var Suite = inherit({
    __constructor: function(name) {
        this.name = name;
        this.url = null;
        this.skipped = false;
        this.captureSelectors = null;
        this.tolerance = null;
        this.ignoreSelectors = [];
        this.beforeActions = [];
        this.afterActions = [];
        this.browsers = [];
        this.context = {};
        definePrivate(this);
    },

    addState: function(state) {
        this._states.push(state);
    },

    skip: function(browserSkipMatcher) {
        if (this.skipped === true) {
            return;
        }

        if (!browserSkipMatcher) {
            this.skipped = true;
        } else {
            this.skipped = _.isArray(this.skipped)
                ? this.skipped.concat(browserSkipMatcher)
                : [browserSkipMatcher];
        }
    },

    hasChildNamed: function(name) {
        return _.some(this._children, {name: name});
    },

    hasStateNamed: function(name) {
        return _.some(this._states, {name: name});
    },

    get states() {
        return this._states;
    },

    get children() {
        return this._children;
    },

    addChild: function(suite) {
        suite.parent = this;
        this._children.push(suite);
    },

    removeChild: function(suite) {
        var index = _.indexOf(this._children, suite);

        if (index !== -1) {
            suite.parent = null;
            this._children.splice(index, 1);
        }
    },

    get hasStates() {
        return this._states.length > 0;
    },

    get isRoot() {
        return !this.parent;
    },

    get fullName() {
        return this.isRoot
            ? this.name
            : _.compact([this.parent.fullName, this.name]).join(' ');
    }
});

exports.create = function createSuite(name, parent) {
    if (!parent) {
        return new Suite(name);
    }

    var suite = Object.create(parent);
    definePrivate(suite);
    suite.name = name;
    suite.path = parent.path ? parent.path.concat(name) : [name];
    suite.context = _.clone(parent.context);
    parent.addChild(suite);
    return suite;
};
