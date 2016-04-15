'use strict';

var NewBrowser = require('./new-browser'),
    ExistingBrowser = require('./existing-browser');

module.exports = {
    create: function(config) {
        return new NewBrowser(config);
    },

    fromObject: function(serializedBrowser) {
        return ExistingBrowser.fromObject(serializedBrowser);
    }
};
