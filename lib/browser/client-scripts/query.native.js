'use strict';

exports.first = function(selector) {
    return document.querySelector(selector);
};

exports.all = function(selector) {
    return document.querySelectorAll(selector);
};
