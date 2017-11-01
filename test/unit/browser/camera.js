'use strict';

const Camera = require('lib/browser/camera');
const Image = require('lib/image');
const util = require('lib/browser/util');

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
            takeScreenshot: sinon.stub().returns(Promise.resolve({})),
            currentContext: sinon.stub().returns(Promise.resolve()),
            context: sinon.stub().returns(Promise.resolve()),
            on: sinon.stub()
        };
    }

    describe('captureViewportImage', function() {
        it('should take screenshot', function() {
            var wd = mkWdStub_(),
                camera = new Camera(wd);

            return camera.captureViewportImage()
                .then(function() {
                    assert.calledOnce(wd.takeScreenshot);
                });
        });

        it('should not switch appium context', function() {
            var wd = mkWdStub_(),
                camera = new Camera(wd);

            return camera.captureViewportImage()
                .then(function() {
                    assert.notCalled(wd.context);
                });
        });

        it('should not switch appium context if capture succeeds for the first, but fails for the second time', function() {
            var wd = mkWdStub_(),
                error = new Error('not today');

            wd.takeScreenshot
                .onSecondCall().rejects(error);

            var camera = new Camera(wd),
                result = camera.captureViewportImage()
                    .then(function() {
                        return camera.captureViewportImage();
                    });

            return assert.isRejected(result, error)
                .then(function() {
                    assert.notCalled(wd.context);
                });
        });

        it('should try to switch appium context if taking screenshot fails', function() {
            var wd = mkWdStub_();

            wd.takeScreenshot
                .onFirstCall().rejects(new Error('not today'));

            var camera = new Camera(wd);
            return camera.captureViewportImage()
                .then(function() {
                    assert.calledWithExactly(wd.context, 'NATIVE_APP');
                });
        });

        it('should try to take screenshot after switching context', function() {
            var wd = mkWdStub_();

            wd.takeScreenshot
                .onFirstCall().rejects((new Error('not today')));

            var camera = new Camera(wd);
            return camera.captureViewportImage()
                .then(function() {
                    assert.calledTwice(wd.takeScreenshot);
                });
        });

        it('should restore original context after taking screenshot', function() {
            var wd = mkWdStub_();

            wd.currentContext.returns(Promise.resolve('Original'));
            wd.takeScreenshot
                .onFirstCall().rejects(new Error('not today'));

            var camera = new Camera(wd);
            return camera.captureViewportImage()
                .then(function() {
                    assert.calledWithExactly(wd.context, 'Original');
                });
        });

        it('should fail with original error if switching context does not helps', function() {
            var wd = mkWdStub_(),
                originalError = new Error('Original');

            wd.takeScreenshot
                .onFirstCall().rejects(originalError)
                .onSecondCall().rejects(new Error('still does not work'));

            var camera = new Camera(wd);
            return assert.isRejected(camera.captureViewportImage(), originalError);
        });

        it('should not try to take screenshot without switching context if it failed first time', function() {
            var wd = mkWdStub_(),
                error = new Error('not today');

            wd.takeScreenshot
                .onFirstCall().rejects(error)
                .onThirdCall().rejects(error);

            var camera = new Camera(wd);
            return assert.isRejected(camera.captureViewportImage()
                .then(function() {
                    return camera.captureViewportImage();
                }))
                .then(function() {
                    assert.calledThrice(wd.takeScreenshot);
                });
        });

        describe('captureViewportImage() crop', () => {
            let image, wd, camera;

            beforeEach(() => {
                image = sinon.createStubInstance(Image);
                wd = mkWdStub_();
                Image.fromBase64.returns(image);
            });

            describe('calibrate', () => {
                beforeEach(() => {
                    image.getSize.returns({width: 100, height: 200});
                    camera = new Camera(wd);
                });

                it('should crop according to calibration result', () => {
                    camera.calibrate({top: 6, left: 4});

                    return camera.captureViewportImage()
                        .then(() => {
                            assert.calledWith(image.crop, {
                                left: 4,
                                top: 6,
                                width: 100 - 4,
                                height: 200 - 6
                            });
                        });
                });

                it('should not crop image if calibration was not set', () => {
                    return camera.captureViewportImage()
                        .then(() => {
                            assert.notCalled(image.crop);
                        });
                });
            });

            describe('crop to viewport', () => {
                const mkCamera_ = (browserOptions) => {
                    const screenshotMode = (browserOptions || {}).screenshotMode || 'auto';
                    return new Camera(wd, screenshotMode);
                };
                const page = {
                    viewport: {
                        top: 1,
                        left: 1,
                        width: 100,
                        height: 100
                    }
                };

                it('should not crop image if page disposition was not set', () => {
                    return mkCamera_().captureViewportImage()
                        .then(() => {
                            assert.notCalled(image.crop);
                        });
                });

                it('should crop fullPage image with viewport value if page disposition was set', () => {
                    sandbox.stub(util, 'isFullPage').returns(true);

                    return mkCamera_().captureViewportImage(page)
                        .then(() => {
                            assert.calledWith(image.crop, page.viewport);
                        });
                });

                it('should crop not fullPage image to the left and right', () => {
                    sandbox.stub(util, 'isFullPage').returns(false);

                    return mkCamera_().captureViewportImage(page)
                        .then(() => {
                            assert.calledWith(image.crop, {
                                top: 0, left: 0,
                                width: page.viewport.width,
                                height: page.viewport.height
                            });
                        });
                });

                it('should crop image to the left and right if "viewport" mode was set in config', () => {
                    camera = mkCamera_({screenshotMode: 'viewport'});
                    sandbox.stub(util, 'isFullPage').returns(true);

                    return camera.captureViewportImage(page)
                        .then(() => {
                            assert.calledWith(image.crop, {
                                top: 0, left: 0,
                                width: page.viewport.width,
                                height: page.viewport.height
                            });
                        });
                });
            });
        });
    });
});
