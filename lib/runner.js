'use strict';
var EventEmitter = require('events').EventEmitter,

    q = require('q'),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util'),
    GeminiError = require('./errors/gemini-error'),
    StateError = require('./errors/state-error'),

    BrowserLauncher = require('./browser/launcher'),

    exec = q.denodeify(require('child_process').exec);

module.exports = inherit(EventEmitter, {

    __constructor: function(config, browserLauncher) {
        this.config = config;
        this.browserLauncher = browserLauncher || new BrowserLauncher(config);
    },

    runPlans: function(plans) {
        var _this = this;
        return this._checkGM()
            .then(function() {
                _this.emit('begin');
                return q(_this._prepare());
            })
            .then(function() {
                return promiseUtils.seqMap(plans, _this.runPlan.bind(_this));
            })
            .then(function() {
                _this.emit('end');
            });
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

    runPlan: function(plan) {
        var _this = this;
        this.emit('beginPlan', plan.name);
        return promiseUtils.seqMap(plan.suites, this._runSuite.bind(this))
            .then(function() {
                _this.emit('endPlan', plan.name);
            });
    },

    _runSuite: function(suite) {
        var _this = this;
        this.emit('beginSuite', suite.name);
        return q.all(_this.config.browsers.map(function(browserName) {
                var browser = _this.browserLauncher.launch(browserName);
                return _this._runSuiteInBrowser(suite, browser)
                    .fin(function() {
                        return _this.browserLauncher.stop(browser);
                    });
            }))
            .then(function() {
                _this.emit('endSuite', suite.name);
            });
    },

    _runSuiteInBrowser: function(suite, browser) {
        var _this = this;
        return browser.open(this.config.getAbsoluteUrl(suite.url))
            .then(function() {
                return browser.buildElementsMap(
                    suite.elementsSelectors,
                    suite.dynamicElementsSelectors
                );
            })
            .then(function(elements) {
                return promiseUtils.seqMap(suite.states, function(state) {
                    _this.emit('beginState', state.plan.name, state.name, browser.fullName);
                    return browser.captureState(state, elements)
                        .then(function(image) {
                            return q(_this._processCapture({
                                plan: state.plan,
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
                            _this.emit('endState', state.plan.name, state.name, browser.fullName);
                        });
                });
            });
    },

    _processCapture: function() {
    }

});
