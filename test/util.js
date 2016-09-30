'use strict';

const Browser = require('lib/browser');
const Promise = require('bluebird');
const State = require('lib/state');
const Suite = require('lib/suite');
const _ = require('lodash');

function makeBrowser(capabilities, config) {
    config = _.merge({}, {
        id: 'id',
        desiredCapabilities: capabilities,
        system: {
            coverage: {}
        }
    }, config);
    return Browser.create(config);
}

function browserWithId(id) {
    return Browser.create({
        id,
        desiredCapabilities: {
            browserName: id
        }
    });
}

function makeSuiteStub(opts) {
    opts = _.defaults(opts || {}, {
        name: `some-default-name_${new Date().getTime()}`,
        url: 'some-default-url',
        states: []
    });

    const suite = Suite.create(opts.name, opts.parent);
    suite.beforeActions = ['before', 'actions'];
    suite.afterActions = ['after', 'actions'];

    if (opts.browsers) {
        suite.browsers = opts.browsers;
    }
    opts.states.forEach(function(state) {
        suite.addState(state);
    });
    suite.url = opts.url;

    return suite;
}

function makeStateStub(suite, opts) {
    suite = suite || makeSuiteStub();
    opts = opts || {};

    const state = new State(suite, opts.name || 'default-state-name');
    state.shouldSkip = sinon.stub();

    suite.states.push(state);
    return state;
}

/**
 * Makes suite tree
 * @param {Object} sceleton, keys must be unique for all levels
 * @param {Object} rootOpts options for root suite
 * @return {Object} object, where each suite/state can be accessed by its name
 *
 * Example:
 * var tree = makeSuiteTree({
 *         parent: {
 *             child: {
 *                 grandchild: ['state1', 'state2']
 *             }
 *         }
 *     }, {browsers: ['b1', 'b2']});
 *
 * assert.equal(tree.grandchild.parent, tree.child);
 * assert.equal(tree.state1.suite, tree.grandchild);
 * assert.equal(tree.state1.browsers, ['b1', 'b2']);
 */
function makeSuiteTree(sceleton, rootOpts) {
    rootOpts = _.defaults(rootOpts || {}, {
        browsers: ['default-browser1', 'default-browser2']
    });

    const tree = {};
    mkTree_(sceleton, makeSuiteStub(rootOpts));
    return tree;

    function mkTree_(sceleton, parent) {
        _.forEach(sceleton, (val, name) => {
            if (_.isString(val)) {
                pushToTree_(val, makeStateStub(parent, {name: val}));
            } else {
                const suite = makeSuiteStub({parent: parent, name: name});
                parent.addChild(suite);
                pushToTree_(name, suite);
                mkTree_(val, suite);
            }
        });
    }

    function pushToTree_(name, val) {
        if (tree[name]) {
            throw new Error('Can not make tree, names should be uniq');
        }
        tree[name] = val;
    }
}

function rejectedPromise(error) {
    if (!error) {
        error = new Error('Rejected');
    } else if (typeof error === 'string') {
        error = new Error(error);
    }
    const promise = Promise.reject(error);
    promise.catch(() => {});
    return promise;
}

module.exports = {
    makeBrowser,
    browserWithId,
    makeStateStub,
    makeSuiteStub,
    makeSuiteTree,
    rejectedPromise
};
