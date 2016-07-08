'use strict';

const q = require('q');

const ActionsBuilder = require('lib/tests-api/actions-builder');
const util = require('../../util');

describe('tests-api/actions-builder', () => {
    const sandbox = sinon.sandbox.create();
    const browser = util.makeBrowser();

    const createActionsBuilder = (actions) => new ActionsBuilder(actions || []);

    const runAction = (method, browser, postActions) => {
        const actions = [];

        createActionsBuilder(actions)[method]();
        return actions[0](browser, postActions);
    };

    afterEach(() => sandbox.restore());

    describe('changeOrientation', () => {
        beforeEach(() => {
            sandbox.stub(browser, 'getOrientation').returns(q());
            sandbox.stub(browser, 'setOrientation').returns(q());
        });

        it('should throw in case of passed arguments', () => {
            const fn = () => createActionsBuilder().changeOrientation('awesome argument');

            assert.throws(fn, TypeError, /\.changeOrientation\(\) does not accept any arguments/);
        });

        it('should return ActionsBuilder instance', () => {
            assert.instanceOf(createActionsBuilder().changeOrientation(), ActionsBuilder);
        });

        it('should change orientation from PORTRAIT to LANDSCAPE', () => {
            browser.getOrientation.returns(q('PORTRAIT'));

            return runAction('changeOrientation', browser)
                .then(() => assert.calledWith(browser.setOrientation, 'LANDSCAPE'));
        });

        it('should change orientation from LANDSCAPE to PORTRAIT', () => {
            browser.getOrientation.returns(q('LANDSCAPE'));

            return runAction('changeOrientation', browser)
                .then(() => assert.calledWith(browser.setOrientation, 'PORTRAIT'));
        });

        it('should restore orientation in post actions', () => {
            const postActions = sinon.createStubInstance(ActionsBuilder);

            return runAction('changeOrientation', browser, postActions)
                .then(() => assert.called(postActions.changeOrientation));
        });

        it('should be rejected if getting of orientation fails', () => {
            browser.getOrientation.returns(q.reject('awesome error'));

            return assert.isRejected(runAction('changeOrientation', browser), /awesome error/);
        });

        it('should be rejected if setting of orientation fails', () => {
            browser.setOrientation.returns(q.reject('awesome error'));

            return assert.isRejected(runAction('changeOrientation', browser), /awesome error/);
        });
    });
});
