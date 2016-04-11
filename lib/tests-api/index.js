'use strict';
var Suite = require('../suite'),
    SuiteBuilder = require('./suite-builder'),

    keysCodes = require('./keys-codes');

module.exports = function(suite, browsers) {
    var suiteId = 1,
        testsAPI = keysCodes;

    testsAPI.suite = function(name, callback) {
        if (typeof name !== 'string') {
            throw new TypeError('First argument of the gemini.suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new TypeError('Second argument of the gemini.suite must be a function');
        }

        if (suite.hasChildNamed(name)) {
            throw new Error('Suite ' + name + ' already exists at this level. Choose different name');
        }

        suite = Suite.create(name, suite);
        suite.id = suiteId++;
        if (browsers && suite.parent.isRoot) {
            suite.browsers = browsers;
        }
        callback(new SuiteBuilder(suite));
        if (suite.hasStates) {
            if (!suite.url) {
                throw new Error('URL is required to capture screenshots. ' +
                    'Call suite.setUrl(<DESIRED PATH>) on "' + suite.name +
                    '" suite or one of its parents');
            }

            if (!suite.captureSelectors) {
                throw new Error('Capture region is required to capture screenshots. ' +
                    'Call suite.setCaptureElements(<CSS SELECTORS>) on "' + suite.name +
                    '" suite or one of its parents');
            }
        }
        suite = suite.parent;
    };

    return testsAPI;
};
