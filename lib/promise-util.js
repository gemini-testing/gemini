'use strict';
var q = require('q');

exports.sequence = function sequence(funcs) {
    return funcs.reduce(function(promise, func) {
        return promise.then(func);
    }, q());
};

exports.seqMap = function seqMap(array, callback) {
    return exports.sequence(array.map(function(elem) {
        return function() {
            return callback(elem);
        };
    }));
};
