/*jshint browserify:true*/
'use strict';
var each = Array.prototype.forEach? nativeForEach : myForEach;

function nativeForEach(array, cb) {
    array.forEach(cb);
}

function myForEach(array, cb) {
    for (var i = 0; i < array.length; i++) {
        cb(array[i], i, array);
    }
}

exports.each = each;

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
