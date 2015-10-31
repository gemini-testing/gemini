/*jshint browserify:true*/
'use strict';

var util = require('./util'),
    rect = require('./rect'),
    query = require('./query'),
    Rect = rect.Rect;

if (typeof window === 'undefined') {
    global.__gemini = exports;
} else {
    window.__gemini = exports;
}

exports.query = query;

// Terminology
// - clientRect - the result of calling getBoundingClientRect of the element
// - extRect - clientRect + outline + box shadow
// - elementCaptureRect - sum of extRects of the element and its pseudo-elements
// - captureRect - sum of all elementCaptureRect for each captureSelectors

exports.prepareScreenshot = function prepareScreenshot(selectors, opts) {
    opts = opts || {};
    try {
        return prepareScreenshotUnsafe(selectors, opts);
    } catch (e) {
        return {
            error: 'JS',
            message: e.stack || e.message
        };
    }
};

function prepareScreenshotUnsafe(selectors, opts) {
    var rect = getCaptureRect(selectors);
    if (rect.error) {
        return rect;
    }

    var viewportHeight = window.innerHeight || document.documentElement.clientHeight,
        viewportWidth = window.innerWidth || document.documentElement.clientWidth,
        documentHeight = document.documentElement.scrollHeight,
        documentWidth = document.documentElement.scrollWidth,
        coverage,
        viewPort = new Rect({
            left: util.getScrollLeft(),
            top: util.getScrollTop(),
            width: viewportWidth,
            height: viewportHeight
        });

    if (!viewPort.rectInside(rect)) {
        window.scrollTo(rect.left, rect.top);
    }

    if (opts.coverage) {
        coverage = require('./gemini.coverage').collectCoverage(rect);
    }

    return {
        viewportOffset: {
            top: util.getScrollTop(),
            left: util.getScrollLeft()
        },
        captureArea: rect.serialize(),
        ignoreAreas: findIgnoreAreas(opts.ignoreSelectors),
        viewportHeight: Math.round(viewportHeight),
        documentHeight: Math.round(documentHeight),
        documentWidth: Math.round(documentWidth),
        coverage: coverage,
        canHaveCaret: isEditable(document.activeElement)
    };
}

function getCaptureRect(selectors) {
    var element, elementRect, rect;
    for (var i = 0; i < selectors.length; i++) {
        element = query.first(selectors[i]);
        if (!element) {
            return {
                error: 'NOTFOUND',
                message: 'Can not find element with css selector: ' + selectors[i],
                selector: selectors[i]
            };
        }

        elementRect = getElementCaptureRect(element);
        if (elementRect) {
            rect = rect? rect.merge(elementRect) : elementRect;
        }
    }

    return rect? rect.round() : {
        error: 'HIDDEN',
        message: 'Area with css selector : ' + selectors + ' is hidden',
        selector: selectors
    };
}

function findIgnoreAreas(selectors) {
    var result = [];
    util.each(selectors, function(selector) {
        var element = query.first(selector);
        if (element) {
            result.push(getElementCaptureRect(element).round().serialize());
        }
    });

    return result;
}

function isHidden(css, clientRect) {
    return css.display === 'none' ||
        css.visibility === 'hidden' ||
        css.opacity < 0.0001 ||
        clientRect.width < 0.0001 ||
        clientRect.height < 0.0001;
}

function getElementCaptureRect(element) {
    var pseudo = [':before', ':after'],
        css = window.getComputedStyle(element),
        clientRect = rect.getAbsoluteClientRect(element);

    if (isHidden(css, clientRect)) {
        return null;
    }

    var elementRect = getExtRect(css, clientRect);

    util.each(pseudo, function(pseudoEl) {
        css = window.getComputedStyle(element, pseudoEl);
        elementRect = elementRect.merge(getExtRect(css, clientRect));
    });

    return elementRect;
}

function getExtRect(css, clientRect) {
    var shadows = parseBoxShadow(css.boxShadow),
        outline = parseInt(css.outlineWidth, 10);

    if (isNaN(outline)) {
        outline = 0;
    }

    return adjustRect(clientRect, shadows, outline);
}

function parseBoxShadow(value) {
    value = value || '';
    var regex = /[-+]?\d*\.?\d+px/g,
        values = value.split(','),
        results = [],
        match;

    util.each(values, function(value) {
        if ((match = value.match(regex))) {
            results.push({
                offsetX: parseFloat(match[0]),
                offsetY: parseFloat(match[1]) || 0,
                blurRadius: parseFloat(match[2]) || 0,
                spreadRadius: parseFloat(match[3]) || 0,
                inset: value.indexOf('inset') !== -1
            });
        }
    });
    return results;
}

function adjustRect(rect, shadows, outline) {
    var shadowRect = calculateShadowRect(rect, shadows),
        outlineRect = calculateOutlineRect(rect, outline);
    return shadowRect.merge(outlineRect);
}

function calculateOutlineRect(rect, outline) {
    return new Rect({
        top: Math.max(0, rect.top - outline),
        left: Math.max(0, rect.left - outline),
        bottom: rect.bottom + outline,
        right: rect.right + outline
    });
}

function calculateShadowRect(rect, shadows) {
    var extent = calculateShadowExtent(shadows);
    return new Rect({
        left: Math.max(0, rect.left + extent.left),
        top: Math.max(0, rect.top + extent.top),
        width: rect.width - extent.left + extent.right,
        height: rect.height - extent.top + extent.bottom
    });
}

function calculateShadowExtent(shadows) {
    var result = {top: 0, left: 0, right: 0, bottom: 0};

    util.each(shadows, function(shadow) {
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

function isEditable(element) {
    if (!element) {
        return false;
    }
    return /^(input|textarea)$/i.test(element.tagName) ||
        element.isContentEditable;
}
