'use strict';

var q = require('q'),
    inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('temp'),

    CaptureProcessor = require('./capture-processor'),
    Image = require('../image'),
    NoRefImageError = require('../errors/no-ref-image-error'),

    RunnerEvents = require('../constants/runner-events');

temp.track();

module.exports = inherit(CaptureProcessor, {
    __constructor: function(config, options) {
        this.__base(config, RunnerEvents.END_TEST);
        options = options || {};
        this._tempDir = options.tempDir || temp.path('gemini');
    },

    prepare: function() {
        return fs.makeTree(this._tempDir);
    },

    processCapture: function(capture) {
        var browserConfig = capture.browser.config,
            refPath = browserConfig.getScreenshotPath(
                capture.suite,
                capture.state.name
            ),
            tmpPath = this._tempPath(),
            tolerance = capture.state.tolerance,
            _this = this;

        if (!tolerance && tolerance !== 0) {
            tolerance = browserConfig.tolerance;
        }

        return capture.image.save(tmpPath)
            .then(function() {
                return fs.exists(refPath);
            })
            .then(function(refExists) {
                if (!refExists) {
                    return q.reject(new NoRefImageError(refPath,
                        {
                            suite: capture.suite,
                            state: capture.state,
                            currentPath: tmpPath,
                            browserId: capture.browser.id
                        }));
                }
            })
            .then(function() {
                return [tmpPath, Image.compare(tmpPath, refPath, {
                    strictComparison: browserConfig.strictComparison,
                    canHaveCaret: capture.canHaveCaret,
                    tolerance: tolerance
                })];
            })
            .spread(function(currentPath, isEqual) {
                return {
                    suite: capture.suite,
                    state: capture.state,
                    referencePath: refPath,
                    currentPath: currentPath,
                    browserId: capture.browser.id,
                    sessionId: capture.browser.sessionId,
                    equal: isEqual,
                    saveDiffTo: function(diffPath) {
                        return Image.buildDiff({
                            reference: refPath,
                            current: currentPath,
                            diff: diffPath,
                            diffColor: _this._config.system.diffColor,
                            tolerance: tolerance,
                            strictComparison: browserConfig.strictComparison
                        });
                    }
                };
            });
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    }
});
