'use strict';
exports.each = arrayUtil(Array.prototype.forEach, myForEach);
exports.some = arrayUtil(Array.prototype.some, mySome);
exports.every = arrayUtil(Array.prototype.every, myEvery);

function arrayUtil(nativeFunc, shimFunc) {
    return nativeFunc? contextify(nativeFunc) : shimFunc;
}

/**
 * Makes function f to accept context as a
 * first argument
 */
function contextify(f) {
    return function(ctx) {
        var rest = Array.prototype.slice.call(arguments, 1);
        return f.apply(ctx, rest);
    };
}

function myForEach(array, cb, context) {
    for (var i = 0; i < array.length; i++) {
        cb.call(context, array[i], i, array);
    }
}

function mySome(array, cb, context) {
    for (var i = 0; i < array.length; i++) {
        if (cb.call(context, array[i], i, array)) {
            return true;
        }
    }
    return false;
}

function myEvery(array, cb, context) {
    for (var i = 0; i < array.length; i++) {
        if (!cb.call(context, array[i], i, array)) {
            return false;
        }
    }
    return true;
}

exports.getScrollTop = function() {
    if (typeof window.pageYOffset !== 'undefined') {
        return window.pageYOffset;
    }

    return document.documentElement.scrollTop;
};

exports.getScrollLeft = function() {
    if (typeof window.pageXOffset !== 'undefined') {
        return window.pageXOffset;
    }

    return document.documentElement.scrollLeft;
};
