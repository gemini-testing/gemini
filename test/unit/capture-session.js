'use strict';

const Promise = require('bluebird');

const CaptureSession = require('lib/capture-session');
const ActionsBuilder = require('lib/tests-api/actions-builder');
const StateError = require('lib/errors/state-error');
const {temp, ScreenShooter} = require('gemini-core');

describe('capture session', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(temp);

        sandbox.spy(ScreenShooter, 'create');
        sandbox.stub(ScreenShooter.prototype, 'capture').resolves();
    });

    afterEach(() => sandbox.restore());

    describe('constructor', () => {
        it('should create a screen shooter instance', () => {
            CaptureSession.create({foo: 'bar'});

            assert.calledOnceWith(ScreenShooter.create, {foo: 'bar'});
        });
    });

    describe('runActions', () => {
        let browser;
        let session;

        beforeEach(() => {
            browser = {config: {}};
            session = CaptureSession.create(browser);
        });

        it('should call action in associated browser', () => {
            const action = sinon.spy().named('action');

            return session.runActions([action])
                .then(() => assert.calledOnceWith(action, browser));
        });

        it('should call action with "postActions"', () => {
            const action = sinon.spy().named('action');

            return session.runActions([action])
                .then(() => assert.calledOnceWith(action, sinon.match.any, sinon.match.instanceOf(ActionsBuilder)));
        });

        it('should perform all actions with the same "postActions" instance', () => {
            const action = sinon.spy().named('action');
            sandbox.stub(ActionsBuilder, 'create').returnsArg(0);

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

        it('should rejects if any of passed actions rejected', () => {
            const action1 = sinon.stub().named('action1').resolves();
            const action2 = sinon.stub().named('action2').rejects('foo');

            return assert.isRejected(session.runActions([action1, action2]), /foo/);
        });
    });

    describe('runPostActions', () => {
        let browser;
        let session;

        beforeEach(() => {
            browser = {config: {}};
            session = CaptureSession.create(browser);
        });

        it('should call action in associated browser', () => {
            const action = sinon.spy().named('action');

            sandbox.stub(ActionsBuilder, 'create')
                .callsFake((postActions) => postActions.push(action));

            return session.runActions([action])
                .then(() => session.runPostActions())
                .then(() => assert.deepEqual(action.secondCall.args, [browser]));
        });

        it('should perform post actions in reverse order', () => {
            const mediator = sinon.spy().named('mediator');
            const action1 = sinon.spy().named('action1');
            const action2 = sinon.stub().named('action2').callsFake(() => Promise.delay(1).then(mediator));

            sandbox.stub(ActionsBuilder, 'create')
                .callsFake((postActions) => postActions.push(action1, action2));

            return session.runActions([action1, action2])
                .then(() => session.runPostActions())
                .then(() => assert.callOrder(action2, mediator, action1));
        });

        it('should rejects if any of post actions rejected', () => {
            const action1 = sinon.stub().named('action1').resolves();
            const action2 = sinon.stub().named('action2').rejects('foo');

            sandbox.stub(ActionsBuilder, 'create')
                .callsFake((postActions) => postActions.push(action1, action2));

            return session.runActions([action1, action2])
                .catch(() => assert.isRejected(session.runPostActions(), /foo/));
        });
    });

    describe('prepareScreenshot', () => {
        it('should prepare screenshot', () => {
            const browser = {
                config: {},
                prepareScreenshot: sinon.stub().returns(Promise.resolve())
            };
            const session = CaptureSession.create(browser);
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
            session = CaptureSession.create(browser);
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
            browser.captureViewportImage = sinon.stub().callsFake(() => Promise.reject({}));

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

            const session = CaptureSession.create(browser);

            const obj = session.serialize();

            assert.deepEqual(obj, {
                browser: {some: 'data'}
            });
        });
    });

    describe('capture', () => {
        const capture = (page = {}) => CaptureSession.create({config: {}}).capture(page);

        beforeEach(() => {
            sandbox.stub(CaptureSession.prototype, 'extendWithPageScreenshot').returns(Promise.resolve());
        });

        it('should capture image', () => {
            ScreenShooter.prototype.capture.withArgs({foo: 'bar'}).resolves('image');

            return capture({foo: 'bar'})
                .then((capture) => assert.equal(capture.image, 'image'));
        });

        it('should return the information about the caret on image', () => {
            return capture({canHaveCaret: true})
                .then((capture) => assert.isTrue(capture.canHaveCaret));
        });

        it('should throw if capture fails', () => {
            ScreenShooter.prototype.capture.rejects(new Error('capture fails'));

            return assert.isRejected(capture(), /capture fails/);
        });

        it('should extend an error with page screenshot if capture fails', () => {
            const err = new Error('capture fails');

            ScreenShooter.prototype.capture.rejects(err);

            return capture()
                .catch(() => assert.calledOnceWith(CaptureSession.prototype.extendWithPageScreenshot, err));
        });
    });
});
