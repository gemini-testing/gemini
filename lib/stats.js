'use strict';
var inherit = require('inherit');

module.exports = inherit({
    __constructor: function() {
        this._data = {};
    },

    add: function(key) {
        if (!this._data[key]) {
            this._data[key] = 1;
        } else {
            this._data[key]++;
        }
    },

    get data() {
        return this._data;
    }
});
