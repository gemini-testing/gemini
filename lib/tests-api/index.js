'use strict';

const Suite = require('../suite');
const SuiteBuilder = require('./suite-builder');
const keysCodes = require('./keys-codes');

module.exports = (suite, browsers) => {
    let suiteId = 1;
    const testsAPI = keysCodes;

    testsAPI.suite = (name, callback) => {
        if (typeof name !== 'string') {
            throw new TypeError('First argument of the gemini.suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new TypeError('Second argument of the gemini.suite must be a function');
        }

        if (suite.hasChildNamed(name)) {
            throw new Error(`Suite ${name} already exists at this level. Choose different name`);
        }

        const parent = suite;
        suite = Suite.create(name, parent);
        parent.addChild(suite);
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
