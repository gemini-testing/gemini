'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    Image = require('../../image');

var REPORT_DIR = 'gemini-report',
    REPORT_INDEX = path.join(REPORT_DIR, 'index.html'),
    REPORT_ATTACHMENTS = path.join(REPORT_DIR, 'attach');

function suitePath(suite) {
    var result = '';
    while (suite) {
        result = path.join(suite.name, result);
        suite = suite.parent;
    }
    return result;
}

function attachmentStateDir(suite, stateName) {
    return path.join('attach', suitePath(suite), stateName);
}

// Path to attachments relative to root report
function attachmentRelPath(suite, result, kind) {
    return path.join(attachmentStateDir(suite, result.stateName),
        result.browserName + '~' + kind + '.png');
}

Handlebars.registerHelper('status', function() {
    return this.equal? 'success' : 'fail';
});

Handlebars.registerHelper('image', function(kind) {
    return new Handlebars.SafeString(
            '<img src="' +
            encodeURI(this[kind + 'Path']) +
            '">');
});

Handlebars.registerHelper('stacktrace', function() {
    var error = this.error.originalError || this.error;
    return error.stack || error.message || error;
});

module.exports = function htmlReporter(tester) {
    var currentSuite,
        attachmentsQueue;

    tester.on('begin', function() {
        currentSuite = {name: '',children: [], parent: null};
        attachmentsQueue = fs.makeTree(REPORT_ATTACHMENTS);
    });

    tester.on('beginSuite', function(suiteName) {
        var suite = {
            name: suiteName,
            states: [],
            statesByName: {},
            children: [],
            parent: currentSuite
        };
        currentSuite.children.push(suite);
        currentSuite = suite;
    });

    tester.on('endSuite', function(suiteName) {
        currentSuite = currentSuite.parent;
    });

    tester.on('beginState', function(suiteName, stateName) {
        if (currentSuite.statesByName[stateName]) {
            return;
        }

        var state = {name: stateName, browsers: []};

        currentSuite.states.push(state);
        currentSuite.statesByName[stateName] = state;

        attachmentsQueue.then(function() {
            var dir = path.resolve(REPORT_DIR, attachmentStateDir(currentSuite, state.name));
            return fs.makeTree(dir);
        });
    });

    tester.on('endTest', function(result) {
        var state = currentSuite.statesByName[result.stateName],
            reportData = {
                name: result.browserName,
                equal: result.equal,
                currentPath: attachmentRelPath(currentSuite, result, 'current')
            };
        
        if (!result.equal) {
            reportData.referencePath = attachmentRelPath(currentSuite, result, 'ref');
            reportData.diffPath = attachmentRelPath(currentSuite, result, 'diff');
        }

        state.browsers.push(reportData);

        attachmentsQueue.then(function() {
            var copyCurrent = fs.copy(result.currentPath, path.resolve(REPORT_DIR, reportData.currentPath));
            if (result.equal) {
                return copyCurrent;
            }
            return q.all([
                copyCurrent,
                fs.copy(result.referencePath, path.resolve(REPORT_DIR, reportData.referencePath)),
                Image.buildDiff(result.referencePath, result.currentPath,
                        path.resolve(REPORT_DIR, reportData.diffPath))
            ]);
        });
    });

    tester.on('error', function(error) {
        var state = currentSuite.statesByName[error.stateName];

        state.browsers.push({
            name: error.browserName,
            error: error
        });
    });

    tester.on('end', function () {
        attachmentsQueue
            .then(function() {
                return fs.read(path.resolve(__dirname, 'suite.hbs'));
            })
            .then(function(suiteTpl) {
                Handlebars.registerPartial('suite', suiteTpl);
                return fs.read(path.resolve(__dirname, 'report.hbs'));
            })
            .then(function(tpl) {
                var tplFunc = Handlebars.compile(tpl);
                return tplFunc(currentSuite);
            })
            .then(function(index) {
                return fs.write(REPORT_INDEX, index);
            })
            .fail(function(e) {
                console.log(e.stack);
            })
            .done();
    });
};
