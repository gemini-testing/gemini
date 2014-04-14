'use strict';
var EventEmitter = require('events').EventEmitter,

    q = require('q'),
    exec = q.denodeify(require('child_process').exec),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util'),
    GeminiError = require('./errors/gemini-error'),
    StateError = require('./errors/state-error'),

    BrowserLauncher = require('./browser/launcher');

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
        var _this = this,
            chains = plan.getChains();
        this.emit('beginPlan', plan.name);
        return promiseUtils.seqMap(chains, this._runChain.bind(this))
            .then(function() {
                _this.emit('endPlan', plan.name);
            });
    },

    _runChain: function(chain) {
        var _this = this;
        return q.all(_this.config.browsers.map(function(browserName) {
            var browser = _this.browserLauncher.launch(browserName);
            return _this._runChainInBrowser(chain, browser)
                .fin(function() {
                    return _this.browserLauncher.stop(browser);
                });
        }));
    },

    _runChainInBrowser: function(chain, browser) {
        var _this = this;
        return browser.open(this.config.getAbsoluteUrl(chain.getUrl()))
            .then(function() {
                return browser.buildElementsMap(
                    chain.getElementsSelectors(),
                    chain.getDynamicElementsSelectors()
                );
            })
            .then(function(elements) {
                return promiseUtils.seqMap(chain.getStates(), function(state) {
                    _this.emit('beginState', state.plan.name, state.name, browser.fullName);
                    return browser.captureState(state, elements)
                        .then(function(image) {
                            return q(_this._processCapture({
                                plan: state.plan,
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
