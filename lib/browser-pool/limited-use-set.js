'use strict';
var WeakMap = require('es6-weak-map'),
    q = require('q');

/**
 * Set implementation which allows to get and put an object
 * there only limited amout of times. After limit is reached
 * attempt to put an object there causes the object to be finalized.
 *
 * @constructor
 * @param {Number} useLimit number of times object can be popped from set
 * before finalizing.
 * @param {Function} finalize callback which will be called when value in
 * set needs to be finalized.
 */
function LimitedUseSet(useLimit, finalize) {
    this._useCounts = new WeakMap();
    this._useLimit = useLimit;
    this._finalize = finalize;
    this._objects = [];
}

LimitedUseSet.prototype.push = function(value) {
    if (this._isOverLimit(value)) {
        return this._finalize(value);
    }
    this._objects.push(value);
    return q();
};

LimitedUseSet.prototype._isOverLimit = function(value) {
    return this._useCounts.has(value) &&
        this._useCounts.get(value) >= this._useLimit;
};

LimitedUseSet.prototype.pop = function() {
    if (this._objects.length === 0) {
        return null;
    }
    var result = this._objects.pop(),
        useCount = this._useCounts.get(result) || 0;
    this._useCounts.set(result, useCount + 1);
    return result;
};

LimitedUseSet.prototype.clear = function() {
    return q.all(this._objects.map(this._finalize));
};

module.exports = LimitedUseSet;
