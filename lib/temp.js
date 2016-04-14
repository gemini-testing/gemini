'use strict';

var inherit = require('inherit'),
    temp = require('temp'),
    path = require('path'),
    _ = require('lodash');

temp.track();

var Temp = inherit({
    __constructor: function(dir, opts) {
        opts = opts || {};

        this._tempDir = opts.attach
            ? dir
            : temp.mkdirSync({
                dir: dir && path.resolve(dir),
                prefix: '.gemini.tmp.'
            });
    },

    path: function(opts) {
        return temp.path(_.extend(opts || {}, {
            dir: this._tempDir
        }));
    },

    serialize: function() {
        return {dir: this._tempDir};
    }
});

var tempInstance;
module.exports = {
    init: function(dir) {
        if (!tempInstance) {
            tempInstance = new Temp(dir);
        }
    },

    attach: function(serializedTemp) {
        if (!tempInstance) {
            tempInstance = new Temp(serializedTemp.dir, {attach: true});
        }
    },

    path: function(opts) {
        return tempInstance.path(opts);
    },

    serialize: function() {
        return tempInstance.serialize();
    }
};
