'use strict';

var inherit = require('inherit');

function definePrivate(suite) {
    Object.defineProperty(suite, '_states', {
        writable: false,
        enumerable: false,
        value: []
    });

    Object.defineProperty(suite, '_children', {
        writable: false,
        enumerable: false,
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
        this.beforeHook = function() {};
        this.afterHook = function() {};
        definePrivate(this);
    },

    addState: function(state) {
        this._states.push(state);
    },

    skip: function(browsersList) {
        if (this.skipped === true) {
            return;
        }

        if (!browsersList) {
            this.skipped = true;
        } else if (Array.isArray(this.skipped)) {
            this.skipped = this.skipped.concat(browsersList);
        } else {
            this.skipped = browsersList;
        }
    },

    hasChildNamed: function(name) {
        return this._hasNamed(this._children, name);
    },

    hasStateNamed: function(name) {
        return this._hasNamed(this._states, name);
    },

    _hasNamed: function(collection, name) {
        return collection.some(function(item) {
            return item.name === name;
        });
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

    get hasStates() {
        return this._states.length > 0;
    },

    get isRoot() {
        return !this.parent;
    },

    get deepStatesCount() {
        return this._children.reduce(function(sum, child) {
            return sum + child.deepStatesCount;
        }, this._states.length);
    },

    get fullName() {
        if (!this.parent) {
            return this.name;
        }

        return this.parent.fullName + ' ' + this.name;
    }
});

exports.create = function createSuite(name, parent) {
    if (!parent) {
        return new Suite(name);
    }

    var suite = Object.create(parent);
    definePrivate(suite);
    suite.name = name;
    parent.addChild(suite);
    return suite;
};
