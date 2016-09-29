'use strict';

const q = require('bluebird-q');
const _ = require('lodash');
const promiseUtils = require('q-promise-utils');

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
        sandbox.stub(promiseUtils);
        promiseUtils.sequence.returns(q());

        sandbox.stub(temp);
    });

    afterEach(() => sandbox.restore());

    describe('runActions', () => {
        let browser;
        let session;

        beforeEach(() => {
            browser = {config: {}};
            session = new CaptureSession(browser);
        });

        it('should perform passed action sequence', () => {
            const actions = [];

            session.runActions(actions);

            assert.calledOnce(promiseUtils.sequence);
            assert.calledWith(promiseUtils.sequence, actions);
        });

        it('should perform actions sequence in associated browser', () => {
            session.runActions([]);

            assert.calledWith(promiseUtils.sequence, sinon.match.any, browser);
        });

        it('should peform actions sequence with postActions', () => {
            session.runActions([]);

            assert.calledWith(promiseUtils.sequence,
                sinon.match.any,
                sinon.match.any,
                sinon.match.instanceOf(ActionsBuilder)
            );
        });

        it('should perform all actions with the same postActions instance', () => {
            sandbox.stub(ActionsBuilder.prototype, '__constructor').returnsArg(0);

            session.runActions([]);
            session.runActions([]);

            assert.equal(
                promiseUtils.sequence.firstCall.args[2],
                promiseUtils.sequence.secondCall.args[2]
            );
        });
    });

    describe('runPostActions', () => {
        it('should not pass postActions while performing postActions', () => {
            const browser = {config: {}};
            const session = new CaptureSession(browser);

            session.runPostActions();

            assert.lengthOf(promiseUtils.sequence.firstCall.args, 2);
        });

        it('should perform post actions in reverse order', () => {
            const browser = {config: {}};
            const session = new CaptureSession(browser);

            sandbox.stub(ActionsBuilder.prototype, '__constructor', (postActions) => {
                postActions.push(1, 2, 3);
            });
            session.runActions([]);
            session.runActions([]);

            session.runPostActions();

            assert.calledWith(promiseUtils.sequence, [3, 2, 1, 3, 2, 1]);
        });
    });

    describe('prepareScreenshot', () => {
        it('should prepare screenshot', () => {
            const browser = {
                config: {},
                prepareScreenshot: sinon.stub().returns(q())
            };
            const session = new CaptureSession(browser);
            const state = {
                captureSelectors: ['.selector1', '.selector2'],
                ignoreSelectors: ['.ignore1', '.ignore2']
            };

            return session.prepareScreenshot(state, {some: 'opt'})
                .then(() => assert.calledWith(browser.prepareScreenshot,
                    ['.selector1', '.selector2'],
                    {
                        some: 'opt',
                        ignoreSelectors: ['.ignore1', '.ignore2']
                    }
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
                captureViewportImage: sinon.stub().returns(q({
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
            browser.captureViewportImage = sinon.stub().returns(q.reject({}));

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
            imageStub.crop.returns(q({}));
            imageStub.getSize.returns({});
            imageStub.save.returns(q());

            temp.path.returns('/path/to/img');

            browserStub = {
                config: {},
                captureViewportImage: sinon.stub().returns(q(imageStub)),
                scrollBy: sinon.stub().returns(q())
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

            sandbox.stub(Viewport.prototype, 'crop').returns(q());
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
            browserStub.captureViewportImage.withArgs(page).returns(q('image'));

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
            Viewport.prototype.crop.returns(q('image'));

            assert.eventually.equal(captureSession.capture(page), {
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
                            .withArgs(scrolledPage).returns(q(scrolledViewportScreenshot));

                        return captureSession.capture(page)
                            .then(() => assert.calledWith(Viewport.prototype.extendBy, 2, scrolledViewportScreenshot));
                    });

                    it('should crop capture area which is higher then viewport', () => {
                        page = {captureArea: {height: 7}, viewport: {top: 0, height: 5}};

                        return captureSession.capture(page)
                            .then(() => assert.calledWith(Viewport.prototype.crop, page.captureArea));
                    });

                    it('should return object with cropped image and `canHaveCaret` property', () => {
                        Viewport.prototype.crop.returns(q('image'));

                        assert.eventually.equal(captureSession.capture(page), {
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
