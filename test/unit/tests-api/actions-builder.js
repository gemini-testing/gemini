'use strict';

const q = require('q');

const ActionsBuilder = require('lib/tests-api/actions-builder');
const util = require('../../util');

describe('tests-api/actions-builder', () => {
    const sandbox = sinon.sandbox.create();
    const browser = util.makeBrowser();

    const mkActionsBuilder = (actions) => new ActionsBuilder(actions || []);

    const mkAction = (actionName, browser, postActions) => {
        return function() {
            const actions = [];
            const actionsBuilder = mkActionsBuilder(actions);

            actionsBuilder[actionName].apply(actionsBuilder, arguments);
            return actions[0](browser, postActions);
        };
    };

    afterEach(() => sandbox.restore());

    describe('changeOrientation', () => {
        beforeEach(() => {
            sandbox.stub(browser, 'getOrientation').returns(q());
            sandbox.stub(browser, 'setOrientation').returns(q());
        });

        it('should throw in case of passed arguments', () => {
            const fn = () => mkActionsBuilder().changeOrientation('awesome argument');

            assert.throws(fn, TypeError, /\.changeOrientation\(\) does not accept any arguments/);
        });

        it('should return ActionsBuilder instance', () => {
            assert.instanceOf(mkActionsBuilder().changeOrientation(), ActionsBuilder);
        });

        it('should change orientation from PORTRAIT to LANDSCAPE', () => {
            browser.getOrientation.returns(q('PORTRAIT'));
            const changeOrientation = mkAction('changeOrientation', browser);

            return changeOrientation()
                .then(() => assert.calledWith(browser.setOrientation, 'LANDSCAPE'));
        });

        it('should change orientation from LANDSCAPE to PORTRAIT', () => {
            browser.getOrientation.returns(q('LANDSCAPE'));
            const changeOrientation = mkAction('changeOrientation', browser);

            return changeOrientation()
                .then(() => assert.calledWith(browser.setOrientation, 'PORTRAIT'));
        });

        it('should restore orientation in post actions', () => {
            const postActions = sinon.createStubInstance(ActionsBuilder);
            const changeOrientation = mkAction('changeOrientation', browser, postActions);

            return changeOrientation()
                .then(() => assert.called(postActions.changeOrientation));
        });

        it('should be rejected if getting of orientation fails', () => {
            browser.getOrientation.returns(q.reject('awesome error'));
            const changeOrientation = mkAction('changeOrientation', browser);

            return assert.isRejected(changeOrientation(), /awesome error/);
        });

        it('should be rejected if setting of orientation fails', () => {
            browser.setOrientation.returns(q.reject('awesome error'));
            const changeOrientation = mkAction('changeOrientation', browser);

            return assert.isRejected(changeOrientation(), /awesome error/);
        });
    });
});
