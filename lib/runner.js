'use strict';
var EventEmitter = require('events').EventEmitter,

    q = require('q'),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util'),
    GeminiError = require('./errors/gemini-error'),
    StateError = require('./errors/state-error'),

    BrowserLauncher = require('./browser/launcher'),

    exec = q.denodeify(require('child_process').exec),
    find = require('../lib/find-func').find;

module.exports = inherit(EventEmitter, {

    __constructor: function(config, browserLauncher) {
        this.config = config;
        this.browserLauncher = browserLauncher || new BrowserLauncher(config);
    },

    run: function(suites) {
        var _this = this;
        return this._checkGM()
            .then(function() {
                _this.emit('begin');
                return q(_this._prepare());
            })
            .then(function() {
                return _this._runSuites(suites);
            })
            .then(function() {
                _this.emit('end');
            });
    },

    _runSuites: function(suites) {
        return promiseUtils.seqMap(suites, this._runSuite.bind(this));
    },

    _prepare: function() {
    },

    _checkGM: function() {
        return exec('gm -version')
            .then(function() {
                return true;
            })
            .fail(function() {
                return q.reject(new GeminiError(
                    'Unable to find required package: GraphicsMagick',
                    'Make sure that GraphicsMagick is installed and availiable in your PATH.\n' +
                    'Additonal info and installation instructions:\nhttp://www.graphicsmagick.org/'
                ));
            });
    },

    _runSuite: function(suite) {
        var _this = this;
        this.emit('beginSuite', suite.name);
        return this._runSuiteStates(suite)
            .then(function() {
                return _this._runSuites(suite.children);
            })
            .then(function() {
                _this.emit('endSuite', suite.name);
            });
    },

    _runSuiteStates: function(suite) {
        var _this = this;
        return q.fcall(function() {
            if (!suite.hasStates) {
                return;
            }

            return q.all(_this.config.browsers.map(function(browserName) {
                var browser = _this.browserLauncher.launch(browserName);

                return browser.open(_this.config.getAbsoluteUrl(suite.url))
                    .then(function() {
                        return _this._runSuiteInBrowser(suite, browser)
                            .fin(function() {
                                return _this.browserLauncher.stop(browser);
                            });
                    });
            }));

        });
    },

    _runSuiteInBrowser: function(suite, browser) {
        var _this = this,
            context = {},
            beforeSequence = browser.createActionSequence();

        suite.beforeHook.call(context, beforeSequence, find);

        return beforeSequence.perform()
            .then(function() {
                return promiseUtils.seqMap(suite.states, function(state) {
                    return _this._runStateInBrowser(state, browser, context);
                });
            });
    },

    _runStateInBrowser: function(state, browser, context) {
        var _this = this,
            suite = state.suite;
        if (state.shouldSkip(browser)) {
            _this.emit('skipState', suite.name, state.name, browser.fullName);
            return;
        }
        _this.emit('beginState', suite.name, state.name, browser.fullName);
        return browser.captureState(state, context)
            .then(function(image) {
                return q(_this._processCapture({
                    suite: suite,
                    state: state,
                    browser: browser,
                    image: image
                }));
            })
            .fail(function(e) {
                if (e instanceof StateError) {
                    _this.emit('error', e);
                } else {
                    return q.reject(e);
                }
            })
            .fin(function() {
                _this.emit('endState', suite.name, state.name, browser.fullName);
            });
    },

    _processCapture: function() {
    }

});
