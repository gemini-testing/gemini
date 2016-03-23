'use strict';
/*jshint newcap:false*/
var Sizzle = require('sizzle');

exports.first = function(selector) {
    var elems = Sizzle(selector.trim() + ':first');
    return elems.length > 0? elems[0] : null;
};

exports.all = function(selector) {
    return Sizzle(selector);
};
