'use strict';

var fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    Image = require('lib/image');

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
            // continue regardless of error
        }
    });
};

exports.assertSameImages = function(refName, filePath) {
    return assert.eventually.isTrue(
        Image.compare(imagePath(refName), filePath),
        'expected image to be equal to ' + refName
    );
};
