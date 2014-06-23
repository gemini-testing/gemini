'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    Image = require('../../image');

var REPORT_DIR = 'gemini-report',
    REPORT_INDEX = path.join(REPORT_DIR, 'index.html'),
    REPORT_ATTACHMENTS = path.join(REPORT_DIR, 'attach'),

    REPORT_JS_NAME = 'report.js',
    REPORT_CSS_NAME = 'report.css',
    REPORT_TPL_SRC = path.join(__dirname, 'report.hbs'),
    SUITE_TPL_SRC = path.join(__dirname, 'suite.hbs'),
    REPORT_JS_SRC = path.join(__dirname, REPORT_JS_NAME),
    REPORT_CSS_SRC = path.join(__dirname, REPORT_CSS_NAME),

    REPORT_JS_DST = path.join(REPORT_DIR, REPORT_JS_NAME),
    REPORT_CSS_DST = path.join(REPORT_DIR, REPORT_CSS_NAME);

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
        result.browserId + '~' + kind + '.png');
}

Handlebars.registerHelper('status', function() {
    if (this.skipped) {
        return 'section_status_skip';
    }
    return isOK(this)? 'section_status_success' : 'section_status_fail';
});

Handlebars.registerHelper('has-fails', function() {
    return this.failed > 0? 'summary__key_has-fails' : '';
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

Handlebars.registerHelper('collapse', function() {
    return isOK(this) ? 'section_collapsed' : '';
});

function isOK(section) {
    if ('equal' in section) {
        return section.equal;
    }

    if ('skipped' in section) {
        return true;
    }

    if ('error' in section) {
        return false;
    }

    var result = true;
    if (section.children) {
        result = result && section.children.every(isOK);
    }

    if (section.states) {
        result = result && section.states.every(isOK);
    }

    if (section.browsers) {
        result = result && section.browsers.every(isOK);
    }
    return result;
}

module.exports = function htmlReporter(tester) {
    var currentSuite,
        attachmentsQueue,
        failed,
        passed,
        skipped;

    function createState(name) {
        var state = {
            name: name, 
            browsers: []
        };

        currentSuite.states.push(state);
        currentSuite.statesByName[name] = state;

        createStateDir(state);

        return state;
    }

    function createStateDir(state) {
        attachmentsQueue.then(function() {
            var dir = path.resolve(REPORT_DIR, attachmentStateDir(currentSuite, state.name));
            return fs.makeTree(dir);
        });
    }

    tester.on('begin', function() {
        failed = passed = skipped = 0;
        currentSuite = {
            name: '',
            children: [],
            parent: null,
        };

        attachmentsQueue = fs.makeTree(REPORT_ATTACHMENTS);
    });

    tester.on('beginSuite', function(data) {
        var suite = {
            name: data.suiteName,
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

        createState(stateName);
    });

    tester.on('skipState', function(suiteName, stateName, browserId) {
        var state = currentSuite.statesByName[stateName];
        if (!state) {
            state = createState(stateName);
        }

        state.browsers.push({
            name: browserId,
            skipped: true
        });
        skipped++;
    });

    tester.on('endTest', function(result) {
        var state = currentSuite.statesByName[result.stateName],
            reportData = {
                name: result.browserId,
                tested: true,
                equal: result.equal,
                currentPath: attachmentRelPath(currentSuite, result, 'current'),
            };
        
        if (!result.equal) {
            failed++;
            reportData.referencePath = attachmentRelPath(currentSuite, result, 'ref');
            reportData.diffPath = attachmentRelPath(currentSuite, result, 'diff');
        } else {
            passed++;
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
            name: error.browserId,
            error: error
        });
        failed++;
    });

    tester.on('end', function () {
        attachmentsQueue
            .then(function() {
                return fs.read(SUITE_TPL_SRC);
            })
            .then(function(suiteTpl) {
                Handlebars.registerPartial('suite', suiteTpl);
                return fs.read(REPORT_TPL_SRC);
            })
            .then(function(tpl) {
                var tplFunc = Handlebars.compile(tpl);
                return tplFunc({
                    suites: currentSuite.children,
                    stats: {
                        total: failed + passed + skipped,
                        failed: failed,
                        passed: passed,
                        skipped: skipped
                    }
                });
            })
            .then(function(index) {
                return q.all([
                    fs.write(REPORT_INDEX, index),
                    fs.copy(REPORT_JS_SRC, path.resolve(REPORT_JS_DST)),
                    fs.copy(REPORT_CSS_SRC, path.resolve(REPORT_CSS_DST))
                ]);
            })
            .fail(function(e) {
                console.log(e.stack);
            })
            .done();
    });
};
