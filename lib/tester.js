'use strict';

var inherit = require('inherit'),
    fs = require('q-io/fs'),
    temp = require('temp'),

    Runner = require('./runner'),
    Image = require('./image');

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
                capture.browser.id),
            _this = this;

        return capture.image.save(this._tempPath())
            .then(function(path) {
                return [path, Image.compare(path, refPath, {
                    strictComparison: _this.config.strictComparison,
                    canHaveCaret: capture.canHaveCaret
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
                    browserId: capture.browser.id
                });
            });
    },

    _tempPath: function() {
        return temp.path({dir: this._tempDir, suffix: '.png'});
    }

});
