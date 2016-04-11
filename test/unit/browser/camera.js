'use strict';

var Camera = require('../../../lib/browser/camera'),
    Image = require('../../../lib/image'),
    q = require('q');

describe('browser/camera', function() {
    var sandbox = sinon.sandbox.create();

    beforeEach(function() {
        sandbox.stub(Image, 'fromBase64');
    });

    afterEach(function() {
        sandbox.restore();
    });

    function mkWdStub_() {
        return {
            takeScreenshot: sinon.stub().returns(q({})),
            currentContext: sinon.stub().returns(q()),
            context: sinon.stub().returns(q()),
            on: sinon.stub()
        };
    }

    describe('captureFullscreenImage', function() {
        it('should take screenshot', function() {
            var wd = mkWdStub_(),
                camera = new Camera(wd);

            return camera.captureFullscreenImage()
                .then(function() {
                    assert.calledOnce(wd.takeScreenshot);
                });
        });

        it('should not switch appium context', function() {
            var wd = mkWdStub_(),
                camera = new Camera(wd);

            return camera.captureFullscreenImage()
                .then(function() {
                    assert.notCalled(wd.context);
                });
        });

        it('should not switch appium context if capture succeeds for the first, but fails for the second time', function() {
            var wd = mkWdStub_(),
                error = new Error('not today');

            wd.takeScreenshot
                .onSecondCall().returns(q.reject(error));

            var camera = new Camera(wd),
                result = camera.captureFullscreenImage()
                    .then(function() {
                        return camera.captureFullscreenImage();
                    });

            return assert.isRejected(result, error)
                .then(function() {
                    assert.notCalled(wd.context);
                });
        });

        it('should try to switch appium context if taking screenshot fails', function() {
            var wd = mkWdStub_();

            wd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            var camera = new Camera(wd);
            return camera.captureFullscreenImage()
                .then(function() {
                    assert.calledWithExactly(wd.context, 'NATIVE_APP');
                });
        });

        it('should try to take screenshot after switching context', function() {
            var wd = mkWdStub_();

            wd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            var camera = new Camera(wd);
            return camera.captureFullscreenImage()
                .then(function() {
                    assert.calledTwice(wd.takeScreenshot);
                });
        });

        it('should restore original context after taking screenshot', function() {
            var wd = mkWdStub_();

            wd.currentContext.returns(q('Original'));
            wd.takeScreenshot
                .onFirstCall().returns(q.reject(new Error('not today')));

            var camera = new Camera(wd);
            return camera.captureFullscreenImage()
                .then(function() {
                    assert.calledWithExactly(wd.context, 'Original');
                });
        });

        it('should fail with original error if switching context does not helps', function() {
            var wd = mkWdStub_(),
                originalError = new Error('Original');

            wd.takeScreenshot
                .onFirstCall().returns(q.reject(originalError))
                .onSecondCall().returns(q.reject(new Error('still does not work')));

            var camera = new Camera(wd);
            return assert.isRejected(camera.captureFullscreenImage(), originalError);
        });

        it('should not try to take screenshot without switching context if it failed first time', function() {
            var wd = mkWdStub_(),
                error = new Error('not today');

            wd.takeScreenshot
                .onFirstCall().returns(q.reject(error))
                .onThirdCall().returns(q.reject(error));

            var camera = new Camera(wd);
            return assert.isRejected(camera.captureFullscreenImage()
                .then(function() {
                    return camera.captureFullscreenImage();
                }))
                .then(function() {
                    assert.calledThrice(wd.takeScreenshot);
                });
        });

        it('captureFullscreenImage() should crop according to calibration result', function() {
            var image = sinon.createStubInstance(Image);

            image.getSize.returns({width: 100, height: 200});
            Image.fromBase64.returns(image);

            var wd = mkWdStub_(),
                camera = new Camera(wd);

            camera.calibrate({top: 6, left: 4});

            return camera.captureFullscreenImage()
                .then(function() {
                    assert.calledWith(image.crop, {
                        left: 4,
                        top: 6,
                        width: 100 - 4,
                        height: 200 - 6
                    });
                });
        });
    });
});
