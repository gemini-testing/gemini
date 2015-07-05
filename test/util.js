'use strict';
var Browser = require('../lib/browser');

function makeBrowser(capabilities, config) {
    config = config || {};
    config.id = config.id || 'id';
    config.desiredCapabilities = capabilities;
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
