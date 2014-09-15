'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    Image = require('../../image');

var REPORT_DIR = 'gemini-report',
    REPORT_INDEX = path.join(REPORT_DIR, 'index.html'),
    REPORT_IMAGES = path.join(REPORT_DIR, 'images'),

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

function imageStateDir(suite, stateName) {
    return path.join('images', suitePath(suite), stateName);
}

// Path to images relative to root report
function imageRelPath(suite, result, kind) {
    return path.join(imageStateDir(suite, result.stateName),
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
    return isOK(this)? 'section_collapsed' : '';
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
    var rootSuite,
        browserSuites,
        imageCopyQueue,
        diffColor,
        failed,
        passed,
        skipped;

    function createState(suite, name) {
        var state = {
            name: name,
            browsers: []
        };

        suite.states.push(state);
        suite.statesByName[name] = state;

        createStateDir(suite, state);

        return state;
    }

    function createStateDir(suite, state) {
        imageCopyQueue.then(function() {
            var dir = path.resolve(REPORT_DIR, imageStateDir(suite, state.name));
            return fs.makeTree(dir);
        });
    }

    tester.on('begin', function(data) {
        failed = passed = skipped = 0;
        diffColor = data.config.diffColor;
        rootSuite = {
            name: '',
            children: [],
            childrenByName: {},
            parent: null
        };

        browserSuites = {};
        data.browserIds.forEach(function(browserId) {
            browserSuites[browserId] = rootSuite;
        });

        imageCopyQueue = fs.makeTree(REPORT_IMAGES);
    });

    tester.on('beginSuite', function(data) {
        var currentSuite = browserSuites[data.browserId],
            nextSuite = currentSuite.childrenByName[data.suiteName];

        if (!nextSuite) {
            nextSuite = {
                name: data.suiteName,
                states: [],
                statesByName: {},
                childrenByName: {},
                children: [],
                parent: currentSuite
            };
            currentSuite.children.push(nextSuite);
            currentSuite.childrenByName[nextSuite.name] = nextSuite;
        }
        browserSuites[data.browserId] = nextSuite;
    });

    tester.on('endSuite', function(data) {
        browserSuites[data.browserId] = browserSuites[data.browserId].parent;
    });

    tester.on('beginState', function(data) {
        var currentSuite = browserSuites[data.browserId];
        if (currentSuite.statesByName[data.stateName]) {
            return;
        }

        createState(currentSuite, data.stateName);
    });

    tester.on('skipState', function(data) {
        var currentSuite = browserSuites[data.browserId],
            state = currentSuite.statesByName[data.stateName];

        if (!state) {
            state = createState(currentSuite, data.stateName);
        }

        state.browsers.push({
            name: data.browserId,
            skipped: true
        });
        skipped++;
    });

    tester.on('endTest', function(result) {
        var currentSuite = browserSuites[result.browserId],
            state = currentSuite.statesByName[result.stateName],
            reportData = {
                name: result.browserId,
                tested: true,
                equal: result.equal,
                currentPath: imageRelPath(currentSuite, result, 'current')
            };

        if (!result.equal) {
            failed++;
            reportData.referencePath = imageRelPath(currentSuite, result, 'ref');
            reportData.diffPath = imageRelPath(currentSuite, result, 'diff');
        } else {
            passed++;
        }

        state.browsers.push(reportData);

        imageCopyQueue.then(function() {
            var copyCurrent = fs.copy(result.currentPath, path.resolve(REPORT_DIR, reportData.currentPath));
            if (result.equal) {
                return copyCurrent;
            }

            return q.all([
                copyCurrent,
                fs.copy(result.referencePath, path.resolve(REPORT_DIR, reportData.referencePath)),
                Image.buildDiff({
                    reference: result.referencePath,
                    current: result.currentPath,
                    diff: path.resolve(REPORT_DIR, reportData.diffPath),
                    diffColor: diffColor
                })
            ]);
        });
    });

    tester.on('error', function(error) {
        var currentSuite = browserSuites[error.browserId],
            state = currentSuite.statesByName[error.stateName];

        state.browsers.push({
            name: error.browserId,
            error: error
        });
        failed++;
    });

    function filterEmptySuits(suite) {
        suite.filtered = true;

        if (suite.states && suite.states.length > 0) {
            suite.filtered = false;
        } else {
            suite.children.forEach(function(child) {
                if (!filterEmptySuits(child)) {
                    suite.filtered = false;
                }
            });
        }

        return suite.filtered;
    }

    tester.on('end', function() {
        imageCopyQueue
            .then(function() {
                return fs.read(SUITE_TPL_SRC);
            })
            .then(function(suiteTpl) {
                Handlebars.registerPartial('suite', suiteTpl);
                return fs.read(REPORT_TPL_SRC);
            })
            .then(function(tpl) {
                var tplFunc = Handlebars.compile(tpl);
                filterEmptySuits(rootSuite);
                return tplFunc({
                    suites: rootSuite.children,
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
