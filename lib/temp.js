'use strict';

var inherit = require('inherit'),
    temp = require('temp'),
    path = require('path'),
    _ = require('lodash');

temp.track();

var Temp = inherit({
    __constructor: function(dir) {
        this._tempDir = temp.mkdirSync({
            dir: dir && path.resolve(dir),
            prefix: '.gemini.tmp.'
        });
    },

    path: function(opts) {
        return temp.path(_.extend(opts || {}, {
            dir: this._tempDir
        }));
    }
});

var tempInstance;
module.exports = {
    init: function(dir) {
        tempInstance = new Temp(dir);
    },

    path: function(opts) {
        return tempInstance.path(opts);
    }
};
