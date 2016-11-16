'use strict';

exports.queryFirst = function(selector) {
    return document.querySelector(selector);
};

exports.queryAll = function(selector) {
    return document.querySelectorAll(selector);
};

exports.getComputedStyle = function(element, pseudoElement) {
    return getComputedStyle(element, pseudoElement);
};

exports.matchMedia = function(mediaQuery) {
    return matchMedia(mediaQuery);
};

exports.trim = function(str) {
    return str.trim();
};
