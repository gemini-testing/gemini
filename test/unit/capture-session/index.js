'use strict';

const q = require('q');
const _ = require('lodash');
const promiseUtils = require('q-promise-utils');

const CaptureSession = require('../../../lib/capture-session');
const ActionsBuilder = require('../../../lib/tests-api/actions-builder');
const CoordTransformer = require('../../../lib/capture-session/transformer');
const DefaultTransformer = require('../../../lib/capture-session/transformer/identity-transformer');
const CoordValidator = require('../../../lib/capture-session/coord-validator');
const StateError = require('../../../lib/errors/state-error');
const Image = require('../../../lib/image');
const temp = require('../../../lib/temp');

describe('capture session', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
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
                captureFullscreenImage: sinon.stub().returns(q({
                    save: sinon.stub()
                }))
            };
            session = new CaptureSession(browser);
            error = {};
        });

        it('should call captureFullscreenImage method', () => {
            return session.extendWithPageScreenshot(error)
                .then(() => assert.called(browser.captureFullscreenImage));
        });

        it('should add an image path to error', () => {
            temp.path.returns('/path/to/img');

            return session.extendWithPageScreenshot(error)
                .then(() => assert.deepEqual(error.imagePath, '/path/to/img'));
        });

        it('should not add an image to error if can not captureFullscreenImage', () => {
            browser.captureFullscreenImage = sinon.stub().returns(q.reject({}));

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
        let pageDisposition;
        let browserStub;
        let captureSession;

        beforeEach(() => {
            sandbox.stub(Image.prototype);
            Image.prototype.crop.returns(q({}));
            Image.prototype.getSize.returns({});
            Image.prototype.save.returns(q());

            temp.path.returns('/path/to/img');

            browserStub = {
                config: {},
                captureFullscreenImage: sinon.stub().returns(q(new Image()))
            };

            pageDisposition = {
                documentWidth: 10,
                documentHeight: 10,
                captureArea: {
                    width: 2,
                    height: 3
                },
                ignoreAreas: [{left: 4, top: 4, width: 1, height: 1}]
            };

            sandbox.stub(CoordValidator.prototype, 'validate').returns({failed: false});
            sandbox.stub(DefaultTransformer.prototype, 'transform').returnsArg(0);
            sandbox.stub(CoordTransformer.prototype, 'create').returns(new DefaultTransformer());

            captureSession = new CaptureSession(browserStub);
        });

        it('should take screenshot', function() {
            return captureSession.capture(_.assign({}, pageDisposition))
                .then(() => assert.called(browserStub.captureFullscreenImage));
        });

        it('should crop image of passed size', function() {
            return captureSession
                .capture(pageDisposition)
                .then(() => assert.calledWithMatch(Image.prototype.crop, pageDisposition.captureArea));
        });

        it('should use coordinate transformer for crop area calculation', () => {
            return captureSession.capture(pageDisposition)
                .then(() => {
                    assert.calledWithMatch(
                        CoordTransformer.prototype.create,
                        sinon.match.instanceOf(Image),
                        pageDisposition
                    );
                    assert.calledWith(DefaultTransformer.prototype.transform, pageDisposition.captureArea);
                });
        });

        it('should clear configured ignore area before cropping image', () => {
            return captureSession.capture(pageDisposition)
                .then(() => {
                    assert.calledTwice(DefaultTransformer.prototype.transform);
                    assert.calledWith(
                        DefaultTransformer.prototype.transform.secondCall,
                        pageDisposition.ignoreAreas[0]
                    );
                });
        });

        it('should use coordinate transformer for ignore image areas calculation', () => {
            return captureSession.capture(pageDisposition)
                .then(() => {
                    assert.calledOnce(Image.prototype.clear);
                    assert.callOrder(Image.prototype.clear, Image.prototype.crop);
                });
        });

        it('should clear multiple ignore areas', () => {
            pageDisposition.ignoreAreas.push({left: 5, top: 5, width: 1, height: 1});
            return captureSession.capture(pageDisposition)
                .then(() => {
                    assert.calledTwice(Image.prototype.clear);
                    assert.calledWith(Image.prototype.clear.firstCall, pageDisposition.ignoreAreas[0]);
                    assert.calledWith(Image.prototype.clear.secondCall, pageDisposition.ignoreAreas[1]);
                });
        });

        it('should not crop image if crop area is not completely inside of image borders', () => {
            CoordValidator.prototype.validate.returns({
                failed: true
            });

            return captureSession.capture(pageDisposition)
                .catch(() => assert.notCalled(Image.prototype.crop));
        });

        it('should save page screenshot', () => {
            CoordValidator.prototype.validate.returns({
                failed: true
            });

            return captureSession.capture(pageDisposition)
                .catch(() => assert.calledOnce(Image.prototype.save));
        });

        it('should extend error with path to page screenshot', () => {
            CoordValidator.prototype.validate.returns({
                failed: true
            });

            return captureSession.capture(pageDisposition)
                .catch((error) => assert.equal(error.imagePath, '/path/to/img'));
        });

        it('should return rejected promise if crop area is not completely inside of image borders', () => {
            CoordValidator.prototype.validate.returns({
                failed: true
            });

            return assert.isRejected(captureSession.capture(pageDisposition), StateError);
        });
    });
});
