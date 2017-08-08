'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const CaptureSession = require('lib/capture-session');
const ActionsBuilder = require('lib/tests-api/actions-builder');
const Viewport = require('lib/capture-session/viewport');
const StateError = require('lib/errors/state-error');
const temp = require('lib/temp');
const Image = require('lib/image');

describe('capture session', () => {
    const sandbox = sinon.sandbox.create();
    let imageStub;

    beforeEach(() => {
        imageStub = sinon.createStubInstance(Image);

        sandbox.stub(temp);
    });

    afterEach(() => sandbox.restore());

    describe('run methods', () => {
        let browser;
        let session;

        beforeEach(() => {
            browser = {config: {}};
            session = new CaptureSession(browser);
        });

        describe('runActions', () => {
            it('should call action in associated browser and with "postActions"', () => {
                const action = sinon.spy().named('action');

                return session.runActions([action])
                    .then(() => assert.calledOnceWith(action, browser, sinon.match.instanceOf(ActionsBuilder)));
            });

            it('should perform all actions with the same postActions instance', () => {
                const action = sinon.spy().named('action');
                sandbox.stub(ActionsBuilder.prototype, '__constructor').returnsArg(0);

                return session.runActions([action])
                    .then(() => session.runActions([action]))
                    .then(() => assert.deepEqual(action.firstCall.args[1], action.secondCall.args[1]));
            });

            it('should perform passed actions in order', () => {
                const mediator = sinon.spy().named('mediator');
                const action1 = sinon.stub().named('action1').callsFake(() => Promise.delay(1).then(mediator));
                const action2 = sinon.spy().named('action2');

                return session.runActions([action1, action2])
                    .then(() => assert.callOrder(action1, mediator, action2));
            });

            it('should reject if any of passed actions rejected', () => {
                const action1 = sinon.stub().named('action1').returns(Promise.resolve());
                const action2 = sinon.stub().named('action2').returns(Promise.reject('foo'));

                return assert.isRejected(session.runActions([action1, action2]), /foo/);
            });
        });

        describe('runPostActions', () => {
            it('should call action in associated browser', () => {
                const action = sinon.spy().named('action');

                sandbox.stub(ActionsBuilder.prototype, '__constructor').callsFake((postActions) => {
                    postActions.push(action);
                });

                return session.runActions([action])
                    .then(() => session.runPostActions())
                    .then(() => assert.deepEqual(action.secondCall.args, [browser]));
            });

            it('should perform post actions in reverse order', () => {
                const mediator = sinon.spy().named('mediator');
                const action1 = sinon.spy().named('action1');
                const action2 = sinon.stub().named('action2').callsFake(() => Promise.delay(1).then(mediator));

                sandbox.stub(ActionsBuilder.prototype, '__constructor').callsFake((postActions) => {
                    postActions.push(action1, action2);
                });

                return session.runActions([action1, action2])
                    .then(() => session.runPostActions())
                    .then(() => assert.callOrder(action2, mediator, action1));
            });

            it('should reject if any of post actions rejected', () => {
                const action1 = sinon.stub().named('action1').returns(Promise.resolve());
                const action2 = sinon.stub().named('action2').returns(Promise.reject('foo'));

                sandbox.stub(ActionsBuilder.prototype, '__constructor').callsFake((postActions) => {
                    postActions.push(action1, action2);
                });

                return session.runActions([action1, action2])
                    .catch(() => assert.isRejected(session.runPostActions(), /foo/));
            });
        });
    });

    describe('prepareScreenshot', () => {
        it('should prepare screenshot', () => {
            const browser = {
                config: {},
                prepareScreenshot: sinon.stub().returns(Promise.resolve())
            };
            const session = new CaptureSession(browser);
            const state = {
                captureSelectors: ['.selector1', '.selector2'],
                ignoreSelectors: ['.ignore1', '.ignore2']
            };

            return session.prepareScreenshot(state)
                .then(() => assert.calledWith(browser.prepareScreenshot,
                    ['.selector1', '.selector2'],
                    {ignoreSelectors: ['.ignore1', '.ignore2']}
                ));
        });
    });

    describe('extendWithPageScreenshot', () => {
        let browser;
        let session;
        let error;

        beforeEach(() => {
            browser = {
                config: {},
                captureViewportImage: sinon.stub().returns(Promise.resolve({
                    save: sinon.stub()
                }))
            };
            session = new CaptureSession(browser);
            error = {};
        });

        it('should call captureViewportImage method', () => {
            return session.extendWithPageScreenshot(error)
                .then(() => assert.called(browser.captureViewportImage));
        });

        it('should add an image path to error', () => {
            temp.path.returns('/path/to/img');

            return session.extendWithPageScreenshot(error)
                .then(() => assert.deepEqual(error.imagePath, '/path/to/img'));
        });

        it('should not add an image to error if can not captureViewportImage', () => {
            browser.captureViewportImage = sinon.stub().returns(Promise.reject({}));

            error = new StateError('some error');

            return session.extendWithPageScreenshot(error)
                .then((e) => assert.deepEqual(error, e));
        });
    });

    describe('serialize', () => {
        it('should create object with serialized browser and passed config', () => {
            const browser = {
                serialize: sinon.stub().returns({some: 'data'}),
                config: {someKey: 'some-value'}
            };

            const session = new CaptureSession(browser);

            const obj = session.serialize();

            assert.deepEqual(obj, {
                browser: {some: 'data'}
            });
        });
    });

    describe('capture', () => {
        let page;
        let browserStub;
        let captureSession;

        beforeEach(() => {
            imageStub.crop.returns(Promise.resolve({}));
            imageStub.getSize.returns({});
            imageStub.save.returns(Promise.resolve());

            temp.path.returns('/path/to/img');

            browserStub = {
                config: {},
                captureViewportImage: sinon.stub().returns(Promise.resolve(imageStub)),
                scrollBy: sinon.stub().returns(Promise.resolve())
            };

            page = {
                documentWidth: 10,
                documentHeight: 10,
                captureArea: {
                    width: 2,
                    height: 3
                },
                viewport: {top: 1, left: 1, width: 10, height: 10},
                ignoreAreas: [{left: 4, top: 4, width: 1, height: 1}],
                canHaveCaret: true
            };

            sandbox.stub(Viewport.prototype, 'crop').returns(Promise.resolve());
            sandbox.stub(Viewport.prototype, 'ignoreAreas');

            sandbox.spy(Viewport, 'create');
            sandbox.spy(Viewport.prototype, 'extendBy');

            captureSession = new CaptureSession(browserStub);
        });

        it('should take screenshot', () => {
            return captureSession.capture(_.assign({}, page))
                .then(() => assert.called(browserStub.captureViewportImage));
        });

        it('should create viewport instance', () => {
            browserStub.captureViewportImage.withArgs(page).returns(Promise.resolve('image'));

            return captureSession.capture(page)
                .then(() => {
                    assert.calledWith(Viewport.create, page.viewport, 'image', page.pixelRatio);
                });
        });

        it('should crop image of passed size', () => {
            return captureSession
                .capture(page)
                .then(() => assert.calledWith(Viewport.prototype.crop, page.captureArea));
        });

        it('should return object with cropped image and `canHaveCaret` property', () => {
            Viewport.prototype.crop.returns(Promise.resolve('image'));

            return assert.eventually.deepEqual(captureSession.capture(page), {
                image: 'image',
                canHaveCaret: page.canHaveCaret
            });
        });

        it('should clear configured ignore area before cropping image', () => {
            return captureSession.capture(page)
                .then(() => assert.calledWith(Viewport.prototype.ignoreAreas, page.ignoreAreas));
        });

        describe('if validation fails', () => {
            const testValidationFail = () => {
                it('should not crop image', () => {
                    return captureSession.capture(page)
                        .catch(() => assert.notCalled(imageStub.crop));
                });

                it('should save page screenshot', () => {
                    return captureSession.capture(page)
                        .catch(() => assert.calledOnce(imageStub.save));
                });

                it('should extend error with path to page screenshot', () => {
                    return captureSession.capture(page)
                        .catch((error) => assert.equal(error.imagePath, '/path/to/img'));
                });

                it('should return rejected promise', () => {
                    return assert.isRejected(captureSession.capture(page), StateError);
                });
            };

            describe('with NOT `HeightViewportError`', () => {
                beforeEach(() => {
                    page = {captureArea: {top: -1}};
                });

                testValidationFail();
            });

            describe('with `HeightViewportError`', () => {
                describe('option `compositeImage` is switched off', () => {
                    beforeEach(() => {
                        page = {captureArea: {height: 7}, viewport: {height: 5}};
                    });

                    testValidationFail();
                });

                describe('option `compositeImage` is switched on', () => {
                    beforeEach(() => {
                        browserStub.config.compositeImage = true;
                    });

                    it('should scroll vertically if capture area is higher then viewport', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        return captureSession.capture(page)
                            .then(() => assert.calledWith(browserStub.scrollBy, 0, 2));
                    });

                    it('should scroll vertically until the end of capture area', () => {
                        page = {captureArea: {height: 11}, viewport: {top: 0, height: 5}};

                        return captureSession.capture(page)
                            .then(() => {
                                assert.calledTwice(browserStub.scrollBy);
                                assert.calledWith(browserStub.scrollBy, 0, 5);
                                assert.calledWith(browserStub.scrollBy, 0, 1);
                            });
                    });

                    it('should capture scrolled viewport image', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        return captureSession.capture(page)
                            .then(() => assert.calledWithMatch(browserStub.captureViewportImage, {viewport: {top: 2}}));
                    });

                    // Test does not fairly check that `captureViewportImage` was called after resolving of `scrollBy`
                    it('should capture viewport image after scroll', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        const scrolledPage = {captureArea: {height: 7}, viewport: {top: 2, height: 5}};

                        const scroll = browserStub.scrollBy.withArgs(0, 2).named('scroll');
                        const captureViewportImage = browserStub.captureViewportImage
                            .withArgs(scrolledPage).named('captureViewportImage');

                        return captureSession.capture(page)
                            .then(() => assert.callOrder(scroll, captureViewportImage));
                    });

                    it('should extend original image by scrolled viewport image', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        const scrolledPage = {captureArea: {height: 7}, viewport: {top: 2, height: 5}};
                        const scrolledViewportScreenshot = imageStub;

                        browserStub.captureViewportImage
                            .withArgs(scrolledPage).returns(Promise.resolve(scrolledViewportScreenshot));

                        return captureSession.capture(page)
                            .then(() => assert.calledWith(Viewport.prototype.extendBy, 2, scrolledViewportScreenshot));
                    });

                    it('should crop capture area which is higher then viewport', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        return captureSession.capture(page)
                            .then(() => assert.calledWith(Viewport.prototype.crop, page.captureArea));
                    });

                    it('should return object with cropped image and `canHaveCaret` property', () => {
                        Viewport.prototype.crop.returns(Promise.resolve('image'));

                        return assert.eventually.deepEqual(captureSession.capture(page), {
                            image: 'image',
                            canHaveCaret: page.canHaveCaret
                        });
                    });

                    it('should clear configured ignore area before cropping image', () => {
                        return captureSession.capture(page)
                            .then(() => assert.calledWith(Viewport.prototype.ignoreAreas, page.ignoreAreas));
                    });
                });
            });
        });
    });
});
