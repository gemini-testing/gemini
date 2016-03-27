'use strict';

var q = require('q'),
    inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('temp'),

    StateProcessor = require('./state-processor'),
    ImageProcessor = require('../image-processor'),
    NoRefImageError = require('../errors/no-ref-image-error'),

    RunnerEvents = require('../constants/runner-events');

temp.track();

module.exports = inherit(StateProcessor, {
    __constructor: function(config, options) {
        this.__base(config, RunnerEvents.END_TEST);
        options = options || {};
        this._tempDir = options.tempDir || temp.path('gemini');
        this._imageProcessor = null;
    },

    prepare: function(emitter) {
        this._imageProcessor = new ImageProcessor(emitter);
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
                    var data = _this.getStateData(capture, tmpPath);
                    return q.reject(new NoRefImageError(refPath, data));
                }
            })
            .then(function() {
                return [tmpPath, _this._imageProcessor.compare(tmpPath, refPath, {
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
                        return _this._imageProcessor.buildDiff({
                            reference: refPath,
                            current: currentPath,
                            diff: diffPath,
                            diffColor: _this._config.system.diffColor,
                            tolerance: tolerance
                        });
                    }
                };
            });
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    }
});
