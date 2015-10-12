'use strict';
var Browser = require('../lib/browser'),
    State = require('../lib/state'),
    _ = require('lodash');

function makeBrowser(capabilities, config) {
    config = _.merge({}, {
        id: 'id',
        desiredCapabilities: capabilities,
        system: {
            coverage: {}
        }
    }, config);
    return new Browser(config);
}

function browserWithId(id) {
    return new Browser({
        id: id,
        desiredCapabilities: {
            browserName: id
        }
    });
}

function makeSuiteStub(opts) {
    opts = opts || {};
    return _.defaults(opts, {
        hasStates: opts.states && opts.states.length > 0,
        url: 'some-default-url',
        beforeHook: sinon.spy(),
        afterHook: sinon.spy(),
        states: [],
        runPostActions: sinon.stub()
    });
}

function makeStateStub(suite) {
    var state = new State(suite, 'default-state-name');
    state.shouldSkip = sinon.stub();
    return state;
}

exports.makeBrowser = makeBrowser;
exports.browserWithId = browserWithId;
exports.makeStateStub = makeStateStub;
exports.makeSuiteStub = makeSuiteStub;
