'use strict';
var q = require('q'),
    Rect = require('./geometery/rect');

exports.getMultiple = function getMultiple(elements) {
    return q.all(Object.keys(elements).map(function(key) {
            return exports.get(elements[key]);
        }))
        .then(function(rects) {
            return rects
                .filter(function(rect) {
                    return !rect.isZero();
                })
                .reduce(function(first, second) {
                    return first.merge(second);
                });
        });
};

exports.get = function get(element) {
    return element.getLocation()
        .then(function(pos) {
            return element.getSize().then(function(size) {
                return new Rect(pos.x, pos.y, size.width, size.height);
            });
        })
        .then(function(rect) {
            return element.getCssValue('box-shadow').then(function(boxShadow) {
                var shadows = parseBoxShadow(boxShadow);
                return shadows.reduce(addBoxShadowRect, rect);
            });
        });
};

function parseBoxShadow(value) {
    var regex = /.+? ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px( inset)?/,
        results = [],
        match;

    while ((match = value.match(regex))) {
        //ignore inset shadows
        if (!match[5]) {
            results.push({
                offsetX: +match[1],
                offsetY: +match[2],
                blurRadius: +match[3],
                spreadRadius: +match[4]
            });
        }

        value = value.substring(match.index + match[0].length);
    }
    return results;
}

function addBoxShadowRect(rect, shadow) {
    var size = shadow.blurRadius + shadow.spreadRadius,
        shadowRect = new Rect(
            rect.x + shadow.offsetX - size,
            rect.y + shadow.offsetY - size,
            rect.width - shadow.offsetX + 2 * size,
            rect.height - shadow.offsetY + 2 *size
        );
    return rect.merge(shadowRect);
}
