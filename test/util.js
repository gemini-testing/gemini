'use strict';
var Browser = require('../lib/browser');

function makeBrowser(capabilities, config) {
    config = config || {};
    config.id = 'id';
    config.desiredCapabilities = capabilities;
    return new Browser(config);
}

exports.makeBrowser = makeBrowser;
