'use strict';

var inherit = require('inherit'),
    q = require('q'),
    Browser = require('./index');

module.exports = inherit({
    __constructor: function(config) {
        this.config = config;
        this._launched = 0;
        this._deferQueue = [];
    },

    launch: function(id) {
        if (this._canLaunchBrowser) {
            this._launched++;
            return q(this._newBrowser(id));
        }
        var defer = q.defer();
        this._deferQueue.push({
            id: id,
            defer: defer
        });
        return defer.promise;
    },

    get _canLaunchBrowser() {
        return !this.config.parallelLimit || this._launched < this.config.parallelLimit;
    },

    _newBrowser: function(id) {
        return q.resolve(new Browser(this.config, id, this.config.browsers[id]));
    },

    stop: function(browser) {
        var _this = this;
        return browser.quit()
            .then(function() {
                var queued = _this._deferQueue.pop();
                if (queued) {
                    queued.defer.resolve(_this._newBrowser(queued.id));
                } else {
                    _this._launched--;
                }
            });
    }
});
