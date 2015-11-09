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

function makeStateStub(suite) {
    var state = new State(suite, 'default-state-name');
    state.shouldSkip = sinon.stub();
    return state;
}

exports.makeBrowser = makeBrowser;
exports.browserWithId = browserWithId;
exports.makeStateStub = makeStateStub;
