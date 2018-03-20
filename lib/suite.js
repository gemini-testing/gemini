'use strict';

const _ = require('lodash');

function definePrivate(suite) {
    Object.defineProperty(suite, '_states', {
        value: []
    });

    Object.defineProperty(suite, '_children', {
        value: []
    });
}

module.exports = class Suite {
    constructor(name) {
        this.name = name;
        this.url = null;
        this.skipped = [];
        this.captureSelectors = null;
        this.tolerance = null;
        this.ignoreSelectors = [];
        this.beforeActions = [];
        this.afterActions = [];
        this.browsers = [];
        this.context = {};
        this.file = null;
        definePrivate(this);
    }

    static create(name, parent) {
        if (!parent) {
            return new Suite(name);
        }

        if (_.isEmpty(name)) {
            throw new Error('Empty suite name');
        }

        const suite = Object.create(parent);
        definePrivate(suite);
        suite.name = name;
        suite.path = parent.path ? parent.path.concat(name) : [name];
        suite.context = _.clone(parent.context);

        return suite;
    }

    addState(state) {
        state.suite = this;
        this._states.push(state);
    }

    skip(browserSkipMatcher) {
        this.skipped = this.skipped.concat(browserSkipMatcher);
    }

    shouldSkip(browserId) {
        return this.skipped.some((browserSkipMatcher) => {
            if (browserSkipMatcher.matches(browserId)) {
                this.skipComment = browserSkipMatcher.comment;
                return true;
            }

            return false;
        });
    }

    clone() {
        const clonedSuite = Suite.create(this.name, this.parent);

        _.forOwn(this, (value, key) => {
            clonedSuite[key] = _.clone(value);
        });

        this.children.forEach((child) => clonedSuite.addChild(child.clone()));
        this.states.forEach((state) => clonedSuite.addState(state.clone()));

        return clonedSuite;
    }

    hasChild(name, browsers) {
        return _.some(this.children, (child) => {
            return _.isEqual(child.name, name) && !_.isEmpty(_.intersection(child.browsers, browsers));
        });
    }

    hasStateNamed(name) {
        return _.some(this._states, {name: name});
    }

    get states() {
        return this._states;
    }

    get children() {
        return this._children;
    }

    addChild(child) {
        Object.setPrototypeOf(child, this);
        this._children.push(child);
    }

    removeChild(suite) {
        const index = _.indexOf(this._children, suite);

        if (index !== -1) {
            Object.setPrototypeOf(suite, Suite.prototype);
            this._children.splice(index, 1);
        }
    }

    get hasStates() {
        return this._states.length > 0;
    }

    get isRoot() {
        return !this.parent;
    }

    get parent() {
        const proto = Object.getPrototypeOf(this);
        return proto === Suite.prototype ? null : proto;
    }

    get fullName() {
        return this.isRoot
            ? this.name
            : _.compact([this.parent.fullName, this.name]).join(' ');
    }
};
