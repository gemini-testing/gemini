'use strict';

var q = require('q'),
    inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('temp'),

    Runner = require('./runner'),
    Image = require('./image'),
    StateError = require('./errors/state-error');

temp.track();

module.exports = inherit(Runner, {

    __constructor: function(config, options) {
        this.__base(config);
        options = options || {};
        this._tempDir = options.tempDir || temp.path('gemini');
    },

    _prepare: function() {
        return fs.makeTree(this._tempDir);
    },

    _processCapture: function(capture) {
        var refPath = this.config.getScreenshotPath(
                capture.suite,
                capture.state.name,
                capture.browser.id
            ),
            tmpPath = this._tempPath(),
            tolerance = capture.state.tolerance,
            _this = this;

        if (!tolerance && tolerance !== 0) {
            tolerance = this.config.tolerance;
        }

        return fs.exists(refPath)
            .then(function(refExists) {
                if (!refExists) {
                    return q.reject(new StateError(
                        'Can not find reference image at ' + refPath + '\n' +
                        'Run `gemini gather` command to capture all reference images.'
                    ));
                }
            })
            .then(function() {
                return capture.image.save(tmpPath);
            })
            .then(function() {
                return [tmpPath, Image.compare(tmpPath, refPath, {
                    strictComparison: _this.config.strictComparison,
                    canHaveCaret: capture.canHaveCaret,
                    tolerance: tolerance
                })];
            })
            .spread(function(currentPath, isEqual) {
                _this._stats.add(isEqual? 'passed' : 'failed');
                _this.emit('endTest', {
                    suiteName: capture.suite.name,
                    suiteId: capture.suite.id,
                    stateName: capture.state.name,
                    equal: isEqual,
                    referencePath: refPath,
                    currentPath: currentPath,
                    browserId: capture.browser.id,

                    saveDiffTo: function(diffPath) {
                        return Image.buildDiff({
                            reference: refPath,
                            current: currentPath,
                            diff: diffPath,
                            diffColor: _this.config.diffColor,
                            tolerance: tolerance,
                            strictComparison: _this.config.strictComparison
                        });
                    }
                });
            });
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    }

});
