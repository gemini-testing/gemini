(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';
    var exports = window.__gemini || {},
        each = Array.prototype.forEach? nativeForEach : myForEach;

    function nativeForEach(array, cb) {
        array.forEach(cb);
    }

    function myForEach(array, cb) {
        for (var i = 0; i < array.length; i++) {
            cb(array[i], i, array);
        }
    }

    exports.each = each;

    // Terminology
    // - clientRect - the result of calling getBoundingClientRect of the element
    // - extRect - clientRect + outline + box shadow
    // - elementCaptureRect - sum of extRects of the element and its pseudo-elements
    // - captureRect - sum of all elementCaptureRect for each captureSelectors

    function Rect(data) {
        this.top = data.top;
        this.left = data.left;

        if ('width' in data && 'height' in data) {
            this.width = data.width;
            this.height = data.height;
            this.bottom = data.bottom || this.top + this.height;
            this.right = data.right || this.left + this.width;
        } else if ('bottom' in data && 'right' in data) {
            this.bottom = data.bottom;
            this.right = data.right;
            this.width = data.right - data.left;
            this.height = data.bottom - data.top;
        } else {
            throw new Error('Not enough data for the rect construction');
        }
    }

    Rect.prototype = {
        constructor: Rect,
        merge: function(otherRect) {
            return new Rect({
                left: Math.min(this.left, otherRect.left),
                top: Math.min(this.top, otherRect.top),
                bottom: Math.max(this.bottom, otherRect.bottom),
                right: Math.max(this.right, otherRect.right)
            });
        },

        translate: function(x, y) {
            return new Rect({
                top: this.top + y,
                left: this.left + x,
                width: this.width,
                height: this.height
            });
        },

        pointInside: function(x, y) {
            return x >= this.left && x <= this.right &&
                y >= this.top && y <= this.bottom;
        },

        rectInside: function(rect) {
            return this._keyPoints().every(function(point) {
                return this.pointInside(point[0], point[1]);
            }, this);
        },

        rectIntersects: function(other) {
            return this._anyPointInside(other._keyPoints()) ||
               other._anyPointInside(this._keyPoints());
        },

        round: function() {
            return new Rect({
                top: Math.floor(this.top),
                left: Math.floor(this.left),
                right: Math.ceil(this.right),
                bottom: Math.ceil(this.bottom)
            });
        },

        serialize: function() {
            return {
                top: this.top,
                left: this.left,
                width: this.width,
                height: this.height
            };
        },

        _anyPointInside: function(points) {
            return points.some(function(point) {
                return this.pointInside(point[0], point[1]);
            }, this);
        },

        _keyPoints: function() {
            return [
                [this.left, this.top],
                [this.left, this.bottom],
                [this.right, this.top],
                [this.right, this.bottom]
            ];
        }
    };

    exports.Rect = Rect;

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

        window.scrollTo(rect.left, rect.top);

        var viewportHeight = window.innerHeight || document.documentElement.clientHeight,
            bodyHeight = new Rect(document.querySelector('body').getBoundingClientRect()).height,
            coverage;

        if (opts.coverage) {
            coverage = window.__gemini.collectCoverage(rect);
        }

        return {
            viewportOffset: {
                top: getScrollTop(),
                left: getScrollLeft()
            },
            captureArea: rect.serialize(),
            ignoreAreas: findIgnoreAreas(opts.ignoreSelectors),
            viewportHeight: Math.round(viewportHeight),
            bodyHeight: Math.round(bodyHeight),
            coverage: coverage,
            canHaveCaret: isEditable(document.activeElement)
        };
    }

    function getCaptureRect(selectors) {
        var element, elementRect, rect;
        for (var i = 0; i<selectors.length; i++) {
            element = document.querySelector(selectors[i]);
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
        return rect && rect.round();
    }

    function findIgnoreAreas(selectors) {
        var result = [];
        each(selectors, function(selector) {
            var element = document.querySelector(selector);
            if (element) {
                result.push(getElementCaptureRect(element).round().serialize());
            }
        });
        return result;
    }

    exports.getAbsoluteClientRect = function getAbsoluteClientRect(element) {
        var clientRect = new Rect(element.getBoundingClientRect());
        return clientRect.translate(getScrollLeft(), getScrollTop());
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

    function getElementCaptureRect(element) {
        var pseudo = [':before', ':after'],
            css = window.getComputedStyle(element),
            clientRect = exports.getAbsoluteClientRect(element);

        if (isHidden(css, clientRect)) {
            return null;
        }

        var elementRect = getExtRect(css, clientRect);

        each(pseudo, function(pseudoEl) {
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

        each(values, function(value) {
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
        each(shadows, function(shadow) {
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

    window.__gemini = exports;
}(window));
