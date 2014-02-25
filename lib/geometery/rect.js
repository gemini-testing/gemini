'use strict';
var inherit = require('inherit');

var Rect = inherit({

    //it's ok to have 4 parameters for rect class constructor -
    //purpose and ordering of such params are typical
    /*jshint maxparams: 4*/
    __constructor: function(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        Object.defineProperties(this, {
            right: {
                get: function() {
                    return this.x + this.width;
                }
            },

            bottom: {
                get: function() {
                    return this.y + this.height;
                }
            }
        });

    },

    merge: function(other) {
        var x = Math.min(this.x, other.x),
            y = Math.min(this.y, other.y);

        return new Rect(
            x,
            y,
            Math.max(this.right, other.right) - x,
            Math.max(this.bottom, other.bottom) - y
        );
    }

});

module.exports = Rect;
