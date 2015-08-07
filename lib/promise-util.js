'use strict';
var q = require('q'),
    _ = require('lodash');

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

/**
 * Waits for all promises in array to be resolved or rejected.
 * Unlike Q.allSettled, rejects when any of the promises is rejected.
 * Unlike Q.all does not immediately rejects a promise on a first error
 * and waits for other operations to complete.
 */
exports.waitForResults = function waitForResults(promises) {
    return q.allSettled(promises)
        .then(function(results) {
            var rejected = _.find(results, {state: 'rejected'});
            if (rejected) {
                return q.reject(rejected.reason);
            }
        });
}
