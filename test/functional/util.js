'use strict';

var q = require('q'),
    fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    compareAdapter = require('../../lib/image-processor/compare-adapter');

function imagePath(name) {
    return path.join(__dirname, 'data', 'image', name);
}
exports.imagePath = imagePath;

exports.withTempFile = function(func) {
    var filePath = temp.path({suffix: '.png'});
    return func(filePath).fin(function() {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
        }
    });
};

exports.assertSameImages = function(refName, filePath) {
    return assert.eventually.isTrue(
        q.nfcall(compareAdapter.compare, {
            path1: imagePath(refName),
            path2: filePath
        }),
        'expected image to be equal to ' + refName
    );
};
