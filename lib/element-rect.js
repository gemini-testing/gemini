'use strict';
var q = require('q'),
    Rect = require('./geometery/rect');

exports.getMultiple = function getMultiple(elements) {
    var aliveElements =  elements.filter(function(element) {
        return !!element;
    });

    return q.all(aliveElements.map(function(element) {
            return element.isVisible();
        }))
        .then(function(visibilities) {
            var visibleElements = aliveElements.filter(function(element, index) {
                return visibilities[index];
            });
            return q.all(visibleElements.map(exports.get));
        })
        .then(function(rects) {
            return rects.reduce(function(first, second) {
                return first.merge(second);
            });
        });
};

exports.get = function get(element) {
    return q.all([element.getClientRect(), element.getComputedCss('box-shadow')])
        .spread(function(rect, boxShadow) {
            var shadows = parseBoxShadow(boxShadow);
            return adjustRect(rect, shadows);
        });
};

function parseBoxShadow(value) {
    var regex = /.+? ([-+]?\d*\.?\d+)px ([-+]?\d*\.?\d+)px ([-+]?\d*\.?\d+)px ([-+]?\d*\.?\d+)px( inset)?/,
        results = [],
        match;

    while ((match = value.match(regex))) {
        results.push({
            offsetX: +match[1],
            offsetY: +match[2],
            blurRadius: +match[3],
            spreadRadius: +match[4],
            inset: !!match[5]
        });
        value = value.substring(match.index + match[0].length);
    }
    return results;
}

function adjustRect(rect, shadows) {
    var extent = calculateShadowExtent(shadows);
    return new Rect(
        Math.max(0, rect.x + extent.left),
        Math.max(0, rect.y + extent.top),
        rect.width - extent.left + extent.right,
        rect.height - extent.top + extent.bottom
    );
}

function calculateShadowExtent(shadows) {
    var result = {top: 0, left: 0, right: 0, bottom: 0};
    shadows.forEach(function(shadow) {
        if (shadow.inset) {
            //skip inset shadows
            return;
        }

        var blurAndSpread = shadow.spreadRadius + shadow.blurRadius;
        result.left = Math.min(shadow.offsetX - blurAndSpread, result.left);
        result.right = Math.max(shadow.offsetX + blurAndSpread, result.right);
        result.top = Math.min(shadow.offsetY - blurAndSpread, result.top);
        result.bottom = Math.max(shadow.offsetY + blurAndSpread, result.bottom);
    });
    return result;
}
