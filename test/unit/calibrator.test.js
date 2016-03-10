'use strict';
var q = require('q'),
    path = require('path'),
    fs = require('fs'),
    Calibrator = require('../../lib/calibrator'),
    Image = require('../../lib/image'),
    GeminiError = require('../../lib/errors/gemini-error'),
    browserWithId = require('../util').browserWithId;

describe('calibrator', function() {
    var browser, calibrator;

    function setScreenshot(imageName) {
        var imgPath = path.join(__dirname, '..', 'functional', 'data', 'image', imageName),
            imgData = fs.readFileSync(imgPath);

        browser.captureFullscreenImage.returns(q(new Image(imgData)));
    }

    beforeEach(function() {
        browser = browserWithId('id');
        sinon.stub(browser);
        browser.evalScript.returns(q({innerWidth: 984})); //width of viewport in test image
        browser.open.returns(q());
        calibrator = new Calibrator();
    });

    it('should calculate correct crop area', function() {
        setScreenshot('calibrate.png');
        var result = calibrator.calibrate(browser);
        return q.all([
            assert.eventually.propertyVal(result, 'top', 2),
            assert.eventually.propertyVal(result, 'left', 2)
        ]);
    });

    it('should return also features detected by script', function() {
        setScreenshot('calibrate.png');
        browser.evalScript.returns(q({feature: 'value', innerWidth:984}));
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
        return q.all([
            assert.eventually.propertyVal(result, 'top', 2),
            assert.eventually.propertyVal(result, 'left', 2)
        ]);
    });

    it('should fail on broken calibration page', function() {
        setScreenshot('calibrate-broken.png');
        return assert.isRejected(calibrator.calibrate(browser), GeminiError);
    });
});
