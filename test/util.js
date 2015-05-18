'use strict';
var Browser = require('../lib/browser');

function makeBrowser(capabilities, config) {
    config = config || {};
    config.browsers = {id: capabilities || {}};
    return new Browser(config, 'id');
}

exports.makeBrowser = makeBrowser;
