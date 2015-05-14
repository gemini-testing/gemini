'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    q = require('q'),
    path = require('path'),
    fs = require('fs'),
    Calibrator = require('../lib/calibrator'),
    Browser = require('../lib/browser'),
    Image = require('../lib/image'),
    GeminiError = require('../lib/errors/gemini-error');

describe('calibrator', function() {
    var browser, calibrator;

    function setScreenshot(imageName) {
        var imgPath = path.join(__dirname, 'functional', 'data', 'image', imageName),
            imgData = fs.readFileSync(imgPath);

        browser.captureFullscreenImage.returns(q(new Image(imgData)));
    }

    beforeEach(function() {
        var config = {
            browsers: {
                id: {
                    browserName: 'id'
                }
            }
        };
        browser = new Browser(config, 'id');
        sinon.stub(browser);
        browser.evalScript.returns(q({}));
        browser.open.returns(q());
        calibrator = new Calibrator();
    });

    it('should calculate correct crop area', function() {
        setScreenshot('calibrate.png');
        var result = calibrator.calibrate(browser);
        return assert.eventually.deepEqual(result, {top: 24, left: 6});
    });

    it('should return also features detected by script', function() {
        setScreenshot('calibrate.png');
        browser.evalScript.returns(q({feature: 'value'}));
        var result = calibrator.calibrate(browser);
        return assert.eventually.propertyVal(result, 'feature', 'value');
    });

    it('should not perform the calibration process two times', function() {
        setScreenshot('calibrate.png');
        return calibrator.calibrate(browser)
            .then(function() {
                return calibrator.calibrate(browser);
            })
            .then(function() {
                assert.calledOnce(browser.open);
                assert.calledOnce(browser.evalScript);
                assert.calledOnce(browser.captureFullscreenImage);
            });
    });

    it('should return cached result second time', function() {
        setScreenshot('calibrate.png');
        var result = calibrator.calibrate(browser)
                        .then(function() {
                            return calibrator.calibrate(browser);
                        });
        return assert.eventually.deepEqual(result, {top: 24, left: 6});
    });

    it('should fail on broken calibration page', function() {
        setScreenshot('calibrate-broken.png');
        return assert.isRejected(calibrator.calibrate(browser), GeminiError);
    });
});
