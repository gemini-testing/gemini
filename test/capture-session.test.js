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
                    getSize: sinon.stub().returns(q({}))
                })),
                prepareScreenshot: sinon.stub().returns(q({
                    locationInBody: {},
                    locationInViewport: {},
                    cropSize: {}
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

        it('should crop screenshoot basing on viewport if image is less then body', function() {
            this.browser.prepareScreenshot.returns({
                bodyHeight: 100,
                locationInViewport: {
                    top: 10,
                    left: 20
                },
                locationInBody: {
                    top: 80,
                    left: 30
                },
                cropSize: {
                    width: 20,
                    height: 30
                }
            });
            var image = {
                getSize: sinon.stub().returns(q({
                    width: 100,
                    height: 90
                })),

                crop: sinon.stub().returns(q())
            };
            this.browser.captureFullscreenImage.returns(q(image));

            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.crop, {
                    top: 10,
                    left: 20,
                    width: 20,
                    height: 30
                });
            });
        });

        it('should crop screenshoot basing on body if image is greater then body', function() {
            this.browser.prepareScreenshot.returns({
                bodyHeight: 100,
                locationInViewport: {
                    top: 10,
                    left: 20
                },
                locationInBody: {
                    top: 80,
                    left: 30
                },
                cropSize: {
                    width: 20,
                    height: 30
                }
            });
            var image = {
                getSize: sinon.stub().returns(q({
                    width: 100,
                    height: 150
                })),

                crop: sinon.stub().returns(q())
            };
            this.browser.captureFullscreenImage.returns(q(image));

            return this.session.capture(this.state).then(function() {
                sinon.assert.calledWith(image.crop, {
                    top: 80,
                    left: 30,
                    width: 20,
                    height: 30
                });
            });
        });

        it('should extend any StateErrors with suite, state and browser names', function(done) {
            var error = new StateError('state error');

            this.state.name = 'state';
            this.state.suite = {name: 'suite'};
            this.browser.id = 'bro';

            this.seq.perform.returns(q.reject(error));

            return this.session.capture(this.state).fail(function(e) {
                e.must.be(error);
                e.stateName.must.be('state');
                e.suiteName.must.be('suite');
                e.browserId.must.be('bro');
                done();
            });
        });
    });
});
