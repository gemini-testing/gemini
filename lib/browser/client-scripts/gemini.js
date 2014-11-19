(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';
    var exports = window.__gemini || {};

    exports.prepareScreenshot = function prepareScreenshot(selectors, opts) {
        opts = opts || {};
        try {
            return prepareScreenshotUnsafe(selectors, opts);
        } catch (e) {
            return {
                error: 'JS',
                message: e.stack
            };
        }
    };

    function prepareScreenshotUnsafe(selectors, opts) {
        var rect = getScreenshotRect(selectors);
        if (rect.error) {
            return rect;
        }

        window.scrollTo(rect.left, rect.top);

        var viewportHeight = window.innerHeight,
            bodyHeight = document.querySelector('body').getBoundingClientRect().height,
            coverage;

        if (opts.coverage) {
            coverage = window.__gemini.collectCoverage(rect);
        }

        return {
            cropSize: {
                width: rect.width,
                height: rect.height
            },
            locationInBody: {
                top: rect.top,
                left: rect.left
            },
            locationInViewport: {
                top: rect.top - getScrollTop(),
                left: rect.left - getScrollLeft()
            },
            viewportHeight: Math.round(viewportHeight),
            bodyHeight: Math.round(bodyHeight),
            coverage: coverage,
            canHaveCaret: isEditable(document.activeElement)
        };
    }

    function getScreenshotRect(selectors) {
        var element, css, clientRect, rect, pseudo = [':before', ':after'];
        for (var i = 0; i<selectors.length; i++) {
            element = document.querySelector(selectors[i]);
            if (!element) {
                return {
                    error: 'NOTFOUND',
                    message: 'Can not find element with css selector: ' + selectors[i],
                    selector: selectors[i]
                };
            }

            css = window.getComputedStyle(element);
            clientRect = exports.getAbsoluteClientRect(element);

            if (isHidden(css, clientRect)) {
                continue;
            }

            rect = rectMerge(rect, getElementRect(css, clientRect));

            for (var j = 0; j < pseudo.length; j++) {
                css = window.getComputedStyle(element, pseudo[j]);
                rect = rectMerge(rect, getElementRect(css, clientRect));
            }
        }
        return roundDimensions(rect);
    }

    exports.getAbsoluteClientRect = function getAbsoluteClientRect(element) {
        var clientRect = element.getBoundingClientRect();
        return {
            top: clientRect.top + getScrollTop(),
            left: clientRect.left + getScrollLeft(),
            width: clientRect.width,
            height: clientRect.height
        };
    };

    function getScrollTop() {
        if (typeof window.pageYOffset !== 'undefined') {
            return window.pageYOffset;
        }

        return document.documentElement.scrollTop;
    }

    function getScrollLeft() {
        if (typeof window.pageXOffset !== 'undefined') {
            return window.pageXOffset;
        }

        return document.documentElement.scrollLeft;
    }

    function isHidden(css, clientRect) {
        return css.display === 'none' ||
            css.visibility === 'hidden' ||
            css.opacity < 0.0001 ||
            clientRect.width < 0.0001 ||
            clientRect.height < 0.0001;
    }

    function getElementRect(css, clientRect) {
        var shadows = parseBoxShadow(css.boxShadow),
            outline = parseInt(css.outlineWidth, 10);

        if (isNaN(outline)) {
            outline = 0;
        }

        return adjustRect(clientRect, shadows, outline);
    }

    function parseBoxShadow(value) {
        var regex = /([-+]?\d*\.?\d+)px (?:([-+]?\d*\.?\d+)px)? (?:([-+]?\d*\.?\d+)px)? (?:([-+]?\d*\.?\d+)px)?/,
            values = value.split(','),
            results = [],
            match;

        for (value in values) {
            value = values[value];
            if ((match = value.match(regex))) {
                results.push({
                    offsetX: +match[1],
                    offsetY: +match[2] || 0,
                    blurRadius: +match[3] || 0,
                    spreadRadius: +match[4] || 0,
                    inset: value.indexOf('inset') !== -1
                });
            }
        }
        return results;
    }

    function adjustRect(rect, shadows, outline) {
        var shadowRect = calculateShadowRect(rect, shadows),
            outlineRect = calculateOutlineRect(rect, outline);
        return rectMerge(shadowRect, outlineRect);
    }

    function calculateOutlineRect(rect, outline) {
        return {
            top: Math.max(0, rect.top - outline),
            left: Math.max(0, rect.left - outline),
            width: rect.width + outline * 2,
            height: rect.height + outline * 2
        };
    }

    function calculateShadowRect(rect, shadows) {
        var extent = calculateShadowExtent(shadows);
        return {
            left: Math.max(0, rect.left + extent.left),
            top: Math.max(0, rect.top + extent.top),
            width: rect.width - extent.left + extent.right,
            height: rect.height - extent.top + extent.bottom
        };
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

    function rectMerge(rect1, rect2) {
        if (!rect1) {
            return rect2;
        }
        var left = Math.min(rect1.left, rect2.left),
            top  = Math.min(rect1.top, rect2.top);

        return {
            left: left,
            top: top,
            width: Math.max(exports.getRight(rect1), exports.getRight(rect2)) - left,
            height: Math.max(exports.getBottom(rect1), exports.getBottom(rect2)) - top
        };
    }

    exports.getRight = function getRight(rect) {
        return rect.right || rect.left + rect.width;
    };

    exports.getBottom = function getBottom(rect) {
        return rect.bottom || rect.top + rect.height;
    };

    function roundDimensions(rect) {
        var right = Math.ceil(exports.getRight(rect)),
            bottom = Math.ceil(exports.getBottom(rect)),
            left = Math.floor(rect.left),
            top = Math.floor(rect.top);

        return {
            top: top,
            left: left,
            width: right - left,
            height: bottom - top
        };
    }

    function isEditable(element) {
        if (!element) {
            return false;
        }
        return /^(input|textarea)$/i.test(element.tagName) ||
            element.isContentEditable;
    }

    window.__gemini = exports;
}(window));
