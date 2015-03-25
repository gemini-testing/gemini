'use strict';
var sinon = require('sinon'),
    q = require('q'),
    find = require('../lib/find-func').find,

    CaptureSession = require('../lib/capture-session'),
    Actions = require('../lib/browser/actions.js'),
    StateError = require('../lib/errors/state-error');

describe('capture session', function() {
    describe('runHook', function() {
        beforeEach(function() {
            this.seq = sinon.createStubInstance(Actions);
            this.seq.perform.returns(q());

            this.browser = {
                createActionSequence: sinon.stub().returns(this.seq)
            };
            this.session = new CaptureSession(this.browser);
        });

        it('should call a callback with actions and find', function() {
            var cb = sinon.stub(),
                _this = this;

            return this.session.runHook(cb).then(function() {
                sinon.assert.calledWith(cb, _this.seq, find);
            });
        });

        it('should perform sequence', function() {
            var cb = sinon.stub(),
                _this = this;
            return this.session.runHook(cb).then(function() {
                sinon.assert.called(_this.seq.perform);
            });
        });

        it('should share same context between calls', function() {
            var _this = this;
            return this.session
                .runHook(function() {
                    this.x = 'something';
                })
                .then(function() {
                    return _this.session.runHook(function() {
                        this.x.must.be('something');
                    });
                });
        });

        it('should throw StateError if callback throws', function(done) {
            var error = new Error('example'),
                cb = sinon.stub().throws(error);
            return this.session.runHook(cb).fail(function(e) {
                e.must.be.instanceOf(StateError);
                e.originalError.must.be(error);
                done();
            });
        });
    });

    describe('capture', function() {
        function setupImageLessThenBody(ctx) {
            return setupImage(ctx, 90);
        }

        function setupImageGreaterThenBody(ctx) {
            return setupImage(ctx, 150);
        }

        function setupImage(ctx, height) {
            ctx.browser.prepareScreenshot.returns({
                documentHeight: 100,
                captureArea: {
                    top: 80,
                    left: 30,
                    width: 20,
                    height: 30
                },
                viewportOffset: {
                    top: 70,
                    left: 10
                },
                ignoreAreas: [
                    {top: 90, left: 40, width: 5, height: 8}
                ]
            });

            var image = {
                getSize: sinon.stub().returns({
                    width: 100,
                    height: height
                }),

                crop: sinon.stub().returns(q()),
                clear: sinon.stub().returns(q())
            };
            ctx.browser.captureFullscreenImage.returns(q(image));
            return image;
        }
        beforeEach(function() {
            this.seq = sinon.createStubInstance(Actions);
            this.seq.perform.returns(q());

            this.state = {
                callback: sinon.stub()
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
        });

        it('should call state callback', function() {
            var _this = this;
            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(_this.state.callback, _this.seq, find);
            });
        });

        it('should prepare screenshot before taking it', function() {
            var _this = this;
            this.state.captureSelectors = ['.selector1', '.selector2'];
            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(_this.browser.prepareScreenshot, [
                    '.selector1',
                    '.selector2'
                ]);
            });
        });

        it('should take screenshot', function() {
            var _this = this;

            return _this.session.capture(this.state).then(function() {
                sinon.assert.called(_this.browser.captureFullscreenImage);
            });
        });

        it('should crop screenshoot basing on viewport if image is less then document', function() {
            var image = setupImageLessThenBody(this);
            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.crop, {
                    top: 10,
                    left: 20,
                    width: 20,
                    height: 30
                });
            });
        });

        it('should clear ignored areas basing on viewport if image is less then document', function() {
            var image = setupImageLessThenBody(this);
            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.clear, {
                    top: 20,
                    left: 30,
                    width: 5,
                    height: 8
                });
            });
        });

        it('should crop screenshoot basing on document if image is greater then document', function() {
            var image = setupImageGreaterThenBody(this);

            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.crop, {
                    top: 80,
                    left: 30,
                    width: 20,
                    height: 30
                });
            });
        });

        it('should clear ignored areas basing on document if image is greater then document', function() {
            var image = setupImageGreaterThenBody(this);

            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.clear, {
                    top: 90,
                    left: 40,
                    width: 5,
                    height: 8
                });
            });
        });

        it('should fail when crop area is not located within document area', function(done) {
            this.state.name = 'state';
            this.state.suite = {name: 'suite'};
            this.browser.id = 'bro';

            this.browser.prepareScreenshot.returns({
                documentHeight: 100,
                viewportOffset: {
                    top: 50,
                    left: 0
                },
                captureArea: {
                    top: 50,
                    left: 0,
                    width: 100,
                    height: 100
                },
                ignoreAreas: []
            });
            var image = {
                getSize: sinon.stub().returns({
                    width: 100,
                    height: 90
                }),

                crop: sinon.stub().returns(q())
            };
            this.browser.captureFullscreenImage.returns(q(image));

            return this.session.capture(this.state)
                .then(function() {
                    done(new Error('.capture() must not complete successfully'));
                })
                .fail(function(err) {
                    err.must.be.instanceOf(StateError);
                    done();
                });
        });
    });
});
