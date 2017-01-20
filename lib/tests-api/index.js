'use strict';

const path = require('path');
const _ = require('lodash');
const Suite = require('../suite');
const SuiteBuilder = require('./suite-builder');
const keysCodes = require('./keys-codes');

module.exports = (suite, browsers, file, config) => {
    let suiteId = 1;
    const testsAPI = keysCodes;

    testsAPI.suite = (name, callback) => {
        if (typeof name !== 'string') {
            throw new TypeError('First argument of the gemini.suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new TypeError('Second argument of the gemini.suite must be a function');
        }

        if (suite.hasChild(name, browsers)) {
            throw new Error(`Suite ${name} already exists at this level. Choose different name`);
        }

        const parent = suite;
        suite = Suite.create(name, parent);
        parent.addChild(suite);
        suite.id = suiteId++;

        if (suite.parent.isRoot) {
            if (browsers) {
                suite.browsers = browsers;
            }

            if (file) {
                suite.file = path.relative(config.system.projectRoot, file);
            }
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

    testsAPI.ctx = _.clone(config.system.ctx);

    return testsAPI;
};
