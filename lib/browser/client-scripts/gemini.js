(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';
    var exports = {};

    exports.prepareScreenshot = function prepareScreenshot(selectors) {
        try {
            return prepareScreenshotUnsafe(selectors);
        } catch(e) {
            return {
                error: 'JS',
                message: e.message
            };
        }
    };

    function prepareScreenshotUnsafe(selectors) {
        var rect = getScreenshotRect(selectors);
        if (rect.error) {
            return rect;
        }

        window.scrollTo(rect.left, rect.top);

        var viewportHeight = window.innerHeight,
            bodyHeight = document.querySelector('body').getBoundingClientRect().height;
        
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
            viewportHeight: viewportHeight,
            bodyHeight: bodyHeight
        };
    }

    function getScreenshotRect(selectors) {
        var element, css, clientRect, rect;
        for (var i=0; i<selectors.length; i++) {
            element = document.querySelector(selectors[i]);
            if (!element) {
                return {
                    error: 'NOTFOUND',
                    message: 'Can not find element with css selector: ' + selectors[i],
                    selector: selectors[i]
                };
            }

            css = window.getComputedStyle(element);
            clientRect = getAbsoluteClientRect(element);

            if (isHidden(css, clientRect)) {
                continue;
            }

            rect = rectMerge(rect, getElementRect(css, clientRect));
        }
        return roundDimensions(rect);
    }

    function getAbsoluteClientRect(element) {
        var clientRect = element.getBoundingClientRect();
        return {
            top: clientRect.top + getScrollTop(),
            left: clientRect.left + getScrollLeft(),
            width: clientRect.width,
            height: clientRect.height
        };
    }

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
        var shadows = parseBoxShadow(css.boxShadow);
        return adjustRect(clientRect, shadows);
    }

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
            width: Math.max(getRight(rect1), getRight(rect2)) - left,
            height: Math.max(getBottom(rect1), getBottom(rect2)) - top
        };
    }

    function getRight(rect) {
        return rect.right || rect.left + rect.width;
    }

    function getBottom(rect) {
        return rect.bottom || rect.top + rect.height;
    }

    function roundDimensions(rect) { 
        rect.top = Math.round(rect.top);
        rect.left = Math.round(rect.left);
        rect.width = Math.round(rect.width);
        rect.height = Math.round(rect.height);
        return rect;
    }

    window.__gemini = exports;

}(window));
