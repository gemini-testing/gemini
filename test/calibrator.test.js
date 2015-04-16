'use strict';
var sinon = require('sinon'),
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
        browser.inject.returns(q());
        browser.open.returns(q());
        calibrator = new Calibrator();
    });

    it('should calculate correct crop area', function() {
        setScreenshot('calibrate.png');
        return calibrator.calibrate(browser)
            .then(function(rs) {
                rs.must.eql({top: 24, left: 6, right: 2, bottom: 0});
            });
    });

    it('should not perform the calibration process two times', function() {
        setScreenshot('calibrate.png');
        return calibrator.calibrate(browser)
            .then(function() {
                return calibrator.calibrate(browser);
            })
            .then(function() {
                sinon.assert.calledOnce(browser.open);
                sinon.assert.calledOnce(browser.inject);
                sinon.assert.calledOnce(browser.captureFullscreenImage);
            });
    });

    it('should return cached result second time', function() {
        setScreenshot('calibrate.png');
        return calibrator.calibrate(browser)
            .then(function() {
                return calibrator.calibrate(browser);
            })
            .then(function(rs) {
                rs.must.eql({top: 24, left: 6, right: 2, bottom: 0});
            });
    });

    it('should fail on broken calibration page', function(done) {
        setScreenshot('calibrate-broken.png');
        calibrator.calibrate(browser)
            .then(function(rs) {
                done(new Error('Promise must be rejected'));
            })
            .fail(function(err) {
                if (err instanceof GeminiError) {
                    return done();
                }
                done(new Error('Promise must be rejected with GeminiError'));
            });
    });
});
