'use strict';
var Browser = require('../lib/browser'),
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

exports.makeBrowser = makeBrowser;
exports.browserWithId = browserWithId;
