'use strict';

const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const {Image} = require('gemini-core');
const Calibrator = require('lib/calibrator');
const GeminiError = require('lib/errors/gemini-error');
const {browserWithId} = require('../util');

describe('calibrator', function() {
    let browser, calibrator;

    function setScreenshot(imageName) {
        const imgPath = path.join(__dirname, '..', 'functional', 'data', 'image', imageName);
        const imgData = fs.readFileSync(imgPath);

        browser.captureViewportImage.returns(Promise.resolve(new Image(imgData)));
    }

    beforeEach(function() {
        browser = browserWithId('id');
        sinon.stub(browser);
        browser.evalScript.returns(Promise.resolve({innerWidth: 984})); //width of viewport in test image
        browser.open.returns(Promise.resolve());
        calibrator = new Calibrator();
    });

    it('should calculate correct crop area', function() {
        setScreenshot('calibrate.png');
        const result = calibrator.calibrate(browser);
        return Promise.all([
            assert.eventually.propertyVal(result, 'top', 2),
            assert.eventually.propertyVal(result, 'left', 2)
        ]);
    });

    it('should return also features detected by script', function() {
        setScreenshot('calibrate.png');
        browser.evalScript.returns(Promise.resolve({feature: 'value', innerWidth: 984}));
        const result = calibrator.calibrate(browser);
        return assert.eventually.propertyVal(result, 'feature', 'value');
    });

    it('should not perform the calibration process two times', function() {
        setScreenshot('calibrate.png');
        return calibrator.calibrate(browser)
            .then(() => calibrator.calibrate(browser))
            .then(function() {
                assert.calledOnce(browser.open);
                assert.calledOnce(browser.evalScript);
                assert.calledOnce(browser.captureViewportImage);
            });
    });

    it('should return cached result second time', function() {
        setScreenshot('calibrate.png');
        const result = calibrator.calibrate(browser)
            .then(() => calibrator.calibrate(browser));
        return Promise.all([
            assert.eventually.propertyVal(result, 'top', 2),
            assert.eventually.propertyVal(result, 'left', 2)
        ]);
    });

    it('should fail on broken calibration page', function() {
        setScreenshot('calibrate-broken.png');
        return assert.isRejected(calibrator.calibrate(browser), GeminiError);
    });
});
