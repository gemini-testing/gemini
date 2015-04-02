/*jshint browserify:true*/
'use strict';

var util = require('./util');

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
exports.getAbsoluteClientRect = function getAbsoluteClientRect(element) {
    var clientRect = new Rect(element.getBoundingClientRect());
    return clientRect.translate(util.getScrollLeft(), util.getScrollTop());
};
