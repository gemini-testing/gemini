'use strict';
var _ = require('lodash'),
    q = require('q'),
    promiseUtils = require('q-promise-utils'),

    CaptureSession = require('../../lib/capture-session'),
    ActionsBuilder = require('../../lib/tests-api/actions-builder'),
    StateError = require('../../lib/errors/state-error'),
    Image = require('../../lib/image'),
    temp = require('../../lib/temp');

describe('capture session', function() {
    var sandbox = sinon.sandbox.create();

    beforeEach(function() {
        sandbox.stub(promiseUtils);
        promiseUtils.sequence.returns(q());

        sandbox.stub(temp);
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('runActions', function() {
        beforeEach(function() {
            this.browser = sinon.stub();
            this.session = new CaptureSession(this.browser);
        });

        it('should perform passed action sequence', function() {
            var actions = [];

            this.session.runActions(actions);

            assert.calledOnce(promiseUtils.sequence);
            assert.calledWith(promiseUtils.sequence, actions);
        });

        it('should perform actions sequence in associated browser', function() {
            this.session.runActions([]);

            assert.calledWith(promiseUtils.sequence, sinon.match.any, this.browser);
        });

        it('should peform actions sequence with postActions', function() {
            this.session.runActions([]);

            assert.calledWith(promiseUtils.sequence,
                sinon.match.any,
                sinon.match.any,
                sinon.match.instanceOf(ActionsBuilder)
            );
        });

        it('should perform all actions with the same postActions instance', function() {
            sandbox.stub(ActionsBuilder.prototype, '__constructor').returnsArg(0);

            this.session.runActions([]);
            this.session.runActions([]);

            assert.equal(
                promiseUtils.sequence.firstCall.args[2],
                promiseUtils.sequence.secondCall.args[2]
            );
        });
    });

    describe('runPostActions', function() {
        it('should not pass postActions while performing postActions', function() {
            var browser = sinon.stub(),
                session = new CaptureSession(browser);

            session.runPostActions();

            assert.lengthOf(promiseUtils.sequence.firstCall.args, 2);
        });

        it('should perform post actions in reverse order', function() {
            var browser = sinon.stub(),
                session = new CaptureSession(browser);

            sandbox.stub(ActionsBuilder.prototype, '__constructor', function(postActions) {
                postActions.push(1, 2, 3);
            });
            session.runActions([]);
            session.runActions([]);

            session.runPostActions();

            assert.calledWith(promiseUtils.sequence, [3, 2, 1, 3, 2, 1]);
        });
    });

    describe('prepareScreenshot', function() {
        it('should prepare screenshot', function() {
            var browser = {prepareScreenshot: sinon.stub().returns(q())},
                session = new CaptureSession(browser),
                state = {
                    captureSelectors: ['.selector1', '.selector2'],
                    ignoreSelectors: ['.ignore1', '.ignore2']
                };

            return session.prepareScreenshot(state, {some: 'opt'})
                .then(function() {
                    assert.calledWith(browser.prepareScreenshot,
                        ['.selector1', '.selector2'],
                        {
                            some: 'opt',
                            ignoreSelectors: ['.ignore1', '.ignore2']
                        }
                    );
                });
        });
    });

    describe('capture', function() {
        beforeEach(function() {
            sandbox.stub(Image.prototype);
            Image.prototype.crop.returns(q({}));
            Image.prototype.getSize.returns({});
        });

        function mkBrowserStub_() {
            return {
                captureFullscreenImage: sinon.stub().returns(q(new Image()))
            };
        }

        function capture_(opts) {
            opts = _.defaultsDeep(opts || {}, {
                documentSize: {
                    width: 1920,
                    height: 1080
                },
                viewportOffset: {
                    top: 0,
                    left: 0
                },
                captureArea: {
                    top: 500,
                    left: 500,
                    width: 1,
                    height: 1
                },
                ignoreAreas: [],
                pixelRatio: 1
            });

            opts.browser = opts.browser || mkBrowserStub_();

            var pageDisposition = {
                documentWidth: opts.documentSize.width,
                documentHeight: opts.documentSize.height,
                captureArea: opts.captureArea,
                viewportOffset: opts.viewportOffset,
                ignoreAreas: opts.ignoreAreas,
                pixelRatio: opts.pixelRatio
            };

            return new CaptureSession(opts.browser).capture(pageDisposition);
        }

        it('should take screenshot', function() {
            var browser = mkBrowserStub_();

            return capture_({browser: browser})
                .then(function() {
                    assert.called(browser.captureFullscreenImage);
                });
        });

        it('should crop image of passed size', function() {
            return capture_({
                    captureArea: {
                        width: 20,
                        height: 30
                    }
                })
                .then(function() {
                    assert.calledWithMatch(Image.prototype.crop, {
                        width: 20,
                        height: 30
                    });
                });
        });

        describe('if image size is equal to the document', function() {
            function doCapture_(opts) {
                opts.documentSize = opts.documentSize || {width: 1000, height: 1000};

                Image.prototype.getSize.returns(opts.documentSize);

                return capture_(opts);
            }

            it('should ignore viewport offset when cropping the image', function() {
                return doCapture_({
                        captureArea: {top: 10, left: 10, width: 200, height: 200},
                        viewportOffset: {top: 10, left: 10}
                    })
                    .then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 10,
                            left: 10
                        });
                    });
            });

            it('should ignore viewport offset when clearing ignored areas', function() {
                return doCapture_({
                        ignoreAreas: [{top: 50, left: 50, width: 10, height: 10}],
                        viewportOffset: {top: 10, left: 10}
                    })
                    .then(function() {
                        assert.calledWithMatch(Image.prototype.clear, {
                            top: 50,
                            left: 50
                        });
                    });
            });

            it('should not crop image if left boundary is outside of image', function() {
                return doCapture_({
                        documentSize: {width: 1000, height: 1000},
                        captureArea: {left: 1001}
                    })
                    .then(function() {
                        assert.notCalled(Image.prototype.crop);
                    });
            });

            it('should not crop image if right boundary is outside of image', function() {
                return doCapture_({
                        documentSize: {width: 1000, height: 1000},
                        captureArea: {left: 900, width: 101}
                    })
                    .then(function() {
                        assert.notCalled(Image.prototype.crop);
                    });
            });

            it('should not crop image if top boundary is outside of image', function() {
                return doCapture_({
                        documentSize: {width: 1000, height: 1000},
                        captureArea: {top: 1001}
                    })
                    .then(function() {
                        assert.notCalled(Image.prototype.crop);
                    });
            });

            it('should not crop image if bottom boundary is outside of image', function() {
                return doCapture_({
                        documentSize: {width: 1000, height: 1000},
                        captureArea: {top: 900, height: 101}
                    })
                    .then(function() {
                        assert.notCalled(Image.prototype.crop);
                    });
            });

            it('should scale coords by pixel ratio if browser.usePixelRatio is true', function() {
                var browser = mkBrowserStub_();
                browser.usePixelRatio = true;

                return capture_({
                        captureArea: {top: 1, left: 2, width: 3, height: 4},
                        pixelRatio: 2,
                        browser: browser
                    })
                    .then(function() {
                        assert.calledWith(Image.prototype.crop, {top: 2, left: 4, width: 6, height: 8});
                    });
            });

            it('should ignore pixel ratio when browser.usePixelRatio is false', function() {
                var browser = mkBrowserStub_();
                browser.usePixelRatio = false;

                return capture_({
                        captureArea: {top: 1, left: 2, width: 3, height: 4},
                        pixelRatio: 2,
                        browser: browser
                    })
                    .then(function() {
                        assert.calledWith(Image.prototype.crop, {top: 1, left: 2, width: 3, height: 4});
                    });
            });
        });

        describe('if document is higher then image', function() {
            function doCapture_(opts) {
                opts.imageSize = opts.imageSize || {width: 1000, height: 1000};
                opts.documentSize = {
                    width: opts.imageSize.width,
                    height: opts.imageSize.height + 100
                };

                Image.prototype.getSize.returns(opts.imageSize);

                return capture_(opts);
            }

            it('should subtract top offset when cropping the image', function() {
                return doCapture_({
                        captureArea: {top: 10, left: 10, width: 100, height: 100},
                        viewportOffset: {top: 5}
                    })
                    .then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 10 - 5
                        });
                    });
            });

            it('should subtract top offset when clearing ignored areas', function() {
                return doCapture_({
                        ignoreAreas: [{top: 20, left: 0, width: 50, height: 30}],
                        viewportOffset: {top: 15}
                    })
                    .then(function() {
                        assert.calledWithMatch(Image.prototype.clear, {
                            top: 20 - 15
                        });
                    });
            });

            it('should crop image if capture area is inside image', function() {
                return doCapture_({
                        imageSize: {width: 1000, height: 1000},
                        captureArea: {top: 900, width: 20, height: 101},
                        viewportOffset: {top: 1}
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 899,
                            height: 101
                        });
                    });
            });

            it('should not crop image if capture area is outside of image', function() {
                return doCapture_({
                        imageSize: {width: 1000, height: 1000},
                        captureArea: {top: 900, height: 101 + 1},
                        viewportOffset: {top: 1}
                    })
                    .then(function(data) {
                        assert.notCalled(Image.prototype.crop);
                    });
            });
        });

        describe('if document is wider then image', function() {
            function doCapture_(opts) {
                opts.imageSize = opts.imageSize || {width: 1000, height: 1000};
                opts.documentSize = {
                    width: opts.imageSize.width + 100,
                    height: opts.imageSize.height
                };

                Image.prototype.getSize.returns(opts.imageSize);

                return capture_(opts);
            }

            it('should subtract left offset when cropping the image', function() {
                return doCapture_({
                        captureArea: {top: 10, left: 10, width: 100, height: 100},
                        viewportOffset: {left: 10}
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            left: 10 - 10
                        });
                    });
            });

            it('should subtract left offset when clearing ignored areas', function() {
                return doCapture_({
                        ignoreAreas: [{top: 20, left: 10, width: 50, height: 30}],
                        viewportOffset: {left: 5}
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.clear, {
                            left: 10 - 5
                        });
                    });
            });

            it('should crop image if capture area is inside image', function() {
                return doCapture_({
                        imageSize: {width: 1000, height: 1000},
                        captureArea: {left: 900, width: 101, height: 20},
                        viewportOffset: {left: 1}
                    }).then(function(data) {
                        assert.calledWithMatch(Image.prototype.crop, {
                            left: 899,
                            width: 101
                        });
                    });
            });

            it('should not crop image if capture area outside of image', function() {
                return doCapture_({
                        imageSize: {width: 1000, height: 1000},
                        captureArea: {left: 900, width: 102},
                        viewportOffset: {left: 1}
                    }).then(function(data) {
                        assert.notCalled(Image.prototype.crop);
                    });
            });
        });

        describe('if document shorter than image', function() {
            it('should ignore viewport offset if image size >= document dimension * pixel ratio', function() {
                var browser = mkBrowserStub_();
                browser.usePixelRatio = true;

                Image.prototype.getSize.returns({width: 2000, height: 2000});
                return capture_({
                        documentSize: {width: 1000, height: 1000},
                        pixelRatio: 2,
                        viewportOffset: {top: 1000, left: 1000},
                        captureArea: {top: 10, left: 10},
                        browser: browser
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 10 * 2,
                            left: 10 * 2
                        });
                    });
            });

            it('should ignore viewport offset if browser should not use pixel ratio', function() {
                var browser = mkBrowserStub_();
                browser.usePixelRatio = false;

                Image.prototype.getSize.returns({width: 2000, height: 2000});
                return capture_({
                        documentSize: {width: 1000, height: 1000},
                        pixelRatio: 2,
                        viewportOffset: {top: 5, left: 5},
                        captureArea: {top: 10, left: 10},
                        browser: browser
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 10,
                            left: 10
                        });
                    });
            });

            it('should apply viewport offset if image size < document dimensions * pixel ratio', function() {
                var browser = mkBrowserStub_();
                browser.usePixelRatio = true;

                Image.prototype.getSize.returns({width: 2000, height: 2000});
                return capture_({
                        documentSize: {width: 1000, height: 1000},
                        pixelRatio: 3,
                        viewportOffset: {top: 5, left: 5},
                        captureArea: {top: 100, left: 100},
                        browser: browser
                    }).then(function() {
                        assert.calledWithMatch(Image.prototype.crop, {
                            top: 100 * 3 - 5 * 3,
                            left: 100 * 3 - 5 * 3
                        });
                    });
            });
        });
    });

    describe('extendWithPageScreenshot', function() {
        beforeEach(function() {
            this.browser = {
                captureFullscreenImage: sinon.stub().returns(q({
                    save: sinon.stub()
                }))
            };
            this.session = new CaptureSession(this.browser);
            this.error = {};
        });

        it('should call captureFullscreenImage method', function() {
            var _this = this;

            return this.session.extendWithPageScreenshot(this.error)
                .then(function() {
                    assert.called(_this.browser.captureFullscreenImage);
                });
        });

        it('should add an image path to error', function() {
            var _this = this;

            temp.path.returns('/path/to/img');

            return this.session.extendWithPageScreenshot(this.error)
                .then(function() {
                    assert.deepEqual(_this.error.imagePath, '/path/to/img');
                });
        });

        it('should not add an image to error if can not captureFullscreenImage', function() {
            var _this = this;
            _this.browser.captureFullscreenImage = sinon.stub().returns(q.reject({}));

            this.error = new StateError('some error');

            return this.session.extendWithPageScreenshot(this.error)
                .then(function(e) {
                    assert.deepEqual(_this.error, e);
                });
        });
    });
});
