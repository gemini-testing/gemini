'use strict';

var util = require('util'),
    Promise = require('bluebird'),

    StateError = require('../errors/state-error'),

    NO_CLIENT_FUNC = 'ERRNOFUNC';

/**
 * @param {Browser} browser
 * @param {String} script
 * @constructor
 */
function ClientBridge(browser, script) {
    this._browser = browser;
    this._script = script;
}

/**
 * @param {String} name
 * @param {Array} [args]
 */
ClientBridge.prototype.call = function(name, args) {
    args = args || [];
    return this._callCommand(this._clientMethodCommand(name, args), true);
};

/**
 * @param {String} command
 * @param {Boolean} shouldInject
 */
ClientBridge.prototype._callCommand = function(command, injectAllowed) {
    var _this = this;
    return this._browser.evalScript(command)
        .then(function(result) {
            if (!result || !result.error) {
                return Promise.resolve(result);
            }

            if (result.error !== NO_CLIENT_FUNC) {
                return Promise.reject(new StateError(result.message));
            }

            if (injectAllowed) {
                return _this._inject()
                    .then(function() {
                        return _this._callCommand(command, false);
                    });
            }
            return Promise.reject(new StateError('Unable to inject gemini client script'));
        });
};

/**
 * @param {String} name
 * @param {Array} args
 */
ClientBridge.prototype._clientMethodCommand = function(name, args) {
    var call = util.format('__gemini.%s(%s)',
        name,
        args.map(JSON.stringify).join(', ')
    );
    return this._guardClientCall(call);
};

/**
 * @param {String} call
 */
ClientBridge.prototype._guardClientCall = function(call) {
    return util.format(
        'typeof __gemini !== "undefined"? %s : {error: "%s"}',
        call,
        NO_CLIENT_FUNC
    );
};

ClientBridge.prototype._inject = function() {
    return this._browser.injectScript(this._script);
};

module.exports = ClientBridge;
