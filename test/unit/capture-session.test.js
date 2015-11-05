'use strict';
var sinon = require('sinon'),
    assert = require('chai').assert,
    _ = require('lodash'),
    q = require('q'),
    find = require('../../lib/find-func').find,

    CaptureSession = require('../../lib/capture-session'),
    Actions = require('../../lib/browser/actions.js'),
    createSuite = require('../../lib/suite').create,
    StateError = require('../../lib/errors/state-error');

describe('capture session', function() {
    describe('runHook', function() {
        beforeEach(function() {
            this.seq = sinon.createStubInstance(Actions);
            this.seq.perform.returns(q());

            this.browser = {
                createActionSequence: sinon.stub().returns(this.seq)
            };
            this.session = new CaptureSession(this.browser);
            this.suite = createSuite('');
            this.runWithCallback = function(cb) {
                return this.session.runHook(cb, this.suite);
            };
        });

        it('should call a callback with actions and find', function() {
            var cb = sinon.stub(),
                _this = this;

            return this.runWithCallback(cb).then(function() {
                assert.calledWith(cb, _this.seq, find);
            });
        });

        it('should perform sequence', function() {
            var cb = sinon.stub(),
                _this = this;
            return this.runWithCallback(cb).then(function() {
                assert.called(_this.seq.perform);
            });
        });

        it('should share same context between calls', function() {
            var _this = this;
            return this.runWithCallback(function() {
                    this.x = 'something';
                })
                .then(function() {
                    return _this.runWithCallback(function() {
                        assert.equal(this.x, 'something');
                    });
                });
        });

        it('should throw StateError if callback throws', function() {
            var error = new Error('example'),
                cb = sinon.stub().throws(error);
            return assert.isRejected(this.runWithCallback(cb)).then(function(e) {
                assert.instanceOf(e, StateError);
                assert.equal(e.originalError, error);
            });
        });

        it('should add post actions to the suite after hook finished', function() {
            var _this = this,
                cb = sinon.stub().named('hook'),
                postActions = sinon.createStubInstance(Actions);
            this.seq.getPostActions.returns(postActions);
            sinon.spy(this.suite, 'addPostActions');
            return this.session.runHook(cb, this.suite)
                .then(function() {
                    assert.calledWith(_this.suite.addPostActions, postActions);
                });
        });
    });

    describe('capture', function() {
        beforeEach(function() {
            this.setCaptureData = function(opts) {
                _.defaultsDeep(opts, {
                    documentSize: {
                        width: 1920,
                        height: 1080
                    },
                    imageSize: {
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

                this.browser.prepareScreenshot.returns(q({
                    documentWidth: opts.documentSize.width,
                    documentHeight: opts.documentSize.height,
                    captureArea: opts.captureArea,
                    viewportOffset: opts.viewportOffset,
                    ignoreAreas: opts.ignoreAreas,
                    pixelRatio: opts.pixelRatio
                }));

                var image = {
                    getSize: sinon.stub().returns({
                        width: opts.imageSize.width,
                        height: opts.imageSize.height
                    }),

                    crop: sinon.stub().returns(q({
                        getSize: sinon.stub().returns({
                            width: opts.captureArea.width,
                            height: opts.captureArea.height
                        })
                    })),
                    clear: sinon.stub().returns(q())
                };
                this.browser.captureFullscreenImage.returns(q(image));
                this.image = image;
            };

            this.seq = sinon.createStubInstance(Actions);
            this.seq.perform.returns(q());

            this.state = {
                callback: sinon.stub(),
                suite: sinon.stub(createSuite('suite'))
            };
            this.browser = {
                createActionSequence: sinon.stub().returns(this.seq),
                captureFullscreenImage: sinon.stub().returns(q({
                    crop: sinon.stub().returns(q()),
                    getSize: sinon.stub().returns({})
                })),
                prepareScreenshot: sinon.stub().returns(q({
                    captureArea: {},
                    viewportOffset: {},
                    ignoreAreas: []
                }))
            };
            this.session = new CaptureSession(this.browser);

            this.performCapture = function() {
                return this.session.capture(this.state);
            };
        });

        it('should call state callback', function() {
            var _this = this;
            return this.session.capture(this.state).then(function() {
                assert.calledWith(_this.state.callback, _this.seq, find);
            });
        });

        it('should not make screenshot before prepareScreenshot has been executed', function() {
            var _this = this,
                screenshotData = {
                    captureArea: {},
                    viewportOffset: {},
                    ignoreAreas: []
                },
                spy = sinon.stub().returns(q.resolve(screenshotData));

            // add delay for guaranted call spy in next tick
            this.browser.prepareScreenshot.returns(q.delay(1).then(spy));

            return this.session.capture(this.state).then(function() {
                assert.callOrder(spy, _this.browser.captureFullscreenImage);
            });
        });

        it('should prepare screenshot before taking it', function() {
            var _this = this;
            this.state.captureSelectors = ['.selector1', '.selector2'];
            return this.session.capture(this.state).then(function() {
                assert.calledWith(_this.browser.prepareScreenshot, [
                    '.selector1',
                    '.selector2'
                ]);
            });
        });

        it('should take screenshot', function() {
            var _this = this;

            return _this.session.capture(this.state).then(function() {
                assert.called(_this.browser.captureFullscreenImage);
            });
        });

        describe('if image size is equal to the document', function() {
            beforeEach(function() {
                this.setupImageEqualToDocument = function(opts) {
                    this.setCaptureData({
                        documentSize: {width: 1000, height: 1000},
                        imageSize: {width: 1000, height: 1000},
                        captureArea: opts.captureArea,
                        ignoreAreas: opts.ignoreAreas,
                        viewportOffset: opts.viewportOffset,
                        pixelRatio: opts.pixelRatio
                    });
                };
            });

            it('should ignore viewport offset when cropping the image', function() {
                var _this = this,
                    captureArea = {top: 10, left: 10, width: 100, height: 100};
                this.setupImageEqualToDocument({
                    captureArea: captureArea,
                    viewportOffset: {top: 10, left: 10}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.crop, captureArea);
                    });
            });

            it('should ignore viewport offset when clearing ignored areas', function() {
                var _this = this,
                    ignoreFirst = {top: 50, left: 50, width: 10, height: 10},
                    ignoreSecond = {top: 20, left: 0, width: 50, height: 30};

                this.setupImageEqualToDocument({
                    ignoreAreas: [ignoreFirst, ignoreSecond],
                    viewportOffset: {top: 10, left: 10}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.clear, ignoreFirst);
                        assert.calledWith(_this.image.clear, ignoreSecond);
                    });
            });

            it('should return page screenshot if left boundary is outside of image', function() {
                this.setupImageEqualToDocument({
                    captureArea: {left: 1001}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });

            it('should return page screenshot if right boundary is outside of image', function() {
                this.setupImageEqualToDocument({
                    captureArea: {left: 900, width: 101}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });

            it('should return page screenshot if top boundary is outside of image', function() {
                this.setupImageEqualToDocument({
                    captureArea: {top: 1001}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });

            it('should return page screenshot if bottom boundary is outside of image', function() {
                this.setupImageEqualToDocument({
                    captureArea: {top: 900, height: 101}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });

            it('should scale coords by pixel ratio if browser.usePixelRatio is true', function() {
                var _this = this;
                this.setupImageEqualToDocument({
                    captureArea: {top: 1, left: 2, width: 3, height: 4},
                    pixelRatio: 2
                });

                this.browser.usePixelRatio = true;

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.crop, {top: 2, left: 4, width: 6, height: 8});
                    });
            });

            it('should ignore pixel ratio when browser.usePixelRatio is false', function() {
                var _this = this,
                    captureArea = {top: 1, left: 2, width: 3, height: 4};
                this.setupImageEqualToDocument({
                    captureArea: captureArea,
                    pixelRatio: 2
                });

                this.browser.usePixelRatio = false;

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.crop, captureArea);
                    });
            });
        });

        describe('if document is higher then image', function() {
            beforeEach(function() {
                this.setupDocumentHigherThenImage = function(opts) {
                    this.setCaptureData({
                        documentSize: {width: 1000, height: 2000},
                        imageSize: {width: 1000, height: 1000},
                        captureArea: opts.captureArea,
                        ignoreAreas: opts.ignoreAreas,
                        viewportOffset: opts.viewportOffset
                    });
                };
            });

            it('should subtract top offset when cropping the image', function() {
                var _this = this;
                this.setupDocumentHigherThenImage({
                    captureArea: {top: 10, left: 10, width: 100, height: 100},
                    viewportOffset: {top: 10}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.crop, {
                            top: 0,
                            left: 10,
                            width: 100,
                            height: 100
                        });
                    });
            });

            it('should subtract top offset when clearing ignored areas', function() {
                var _this = this,
                    ignore = {top: 20, left: 0, width: 50, height: 30};

                this.setupDocumentHigherThenImage({
                    ignoreAreas: [ignore],
                    viewportOffset: {top: 15}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.clear, {
                            top: 20 - 15,
                            left: 0,
                            width: 50,
                            height: 30
                        });
                    });
            });

            it('should capture image if bottom border - offset is inside image', function() {
                this.setupDocumentHigherThenImage({
                    captureArea: {top: 900, width: 20, height: 101},
                    viewportOffset: {top: 1}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 20, height: 101}
                        );
                    });
            });

            it('should return page screenshot if bottom border - offset is outside of image', function() {
                this.setupDocumentHigherThenImage({
                    captureArea: {top: 900, height: 101 + 1},
                    viewportOffset: {top: 1}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });
        });

        describe('if document is wider then image', function() {
            beforeEach(function() {
                this.setupDocumentWiderThenImage = function(opts) {
                    this.setCaptureData({
                        documentSize: {width: 2000, height: 1000},
                        imageSize: {width: 1000, height: 1000},
                        captureArea: opts.captureArea,
                        ignoreAreas: opts.ignoreAreas,
                        viewportOffset: opts.viewportOffset
                    });
                };
            });

            it('should subtract left offset when cropping the image', function() {
                var _this = this;
                this.setupDocumentWiderThenImage({
                    captureArea: {top: 10, left: 10, width: 100, height: 100},
                    viewportOffset: {left: 10}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.crop, {
                            top: 10,
                            left: 0,
                            width: 100,
                            height: 100
                        });
                    });
            });

            it('should subtract left offset when clearing ignored areas', function() {
                var _this = this,
                    ignore = {top: 20, left: 10, width: 50, height: 30};

                this.setupDocumentWiderThenImage({
                    ignoreAreas: [ignore],
                    viewportOffset: {left: 5}
                });

                return this.performCapture()
                    .then(function() {
                        assert.calledWith(_this.image.clear, {
                            top: 20,
                            left: 5,
                            width: 50,
                            height: 30
                        });
                    });
            });

            it('should capture image if right border - offset is inside image', function() {
                this.setupDocumentWiderThenImage({
                    captureArea: {left: 900, width: 101, height: 20},
                    viewportOffset: {left: 1}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 101, height: 20}
                        );
                    });
            });

            it('should return page screenshot if right border - offset is outside of image', function() {
                this.setupDocumentWiderThenImage({
                    captureArea: {left: 900, width: 102},
                    viewportOffset: {left: 1}
                });

                return this.performCapture()
                    .then(function(data) {
                        assert.deepEqual(
                            data.image.getSize(),
                            {width: 1000, height: 1000}
                        );
                    });
            });
        });
    });
});
