'use strict';

const _ = require('lodash');
const wd = require('wd');
const Promise = require('bluebird');

const ExistingBrowser = require('lib/browser/existing-browser');

describe('browser/existing-browser', () => {
    const sandbox = sinon.sandbox.create();

    let wdRemote;

    const mkExistingBrowser = (opts) => {
        opts = _.defaults(opts || {}, {
            sessionId: '100500',
            config: {},
            calibration: {}
        });

        return new ExistingBrowser(opts.sessionId, opts.config, opts.calibration);
    };

    beforeEach(() => {
        wdRemote = {
            configureHttp: sinon.stub().returns(Promise.resolve()),
            attach: sinon.stub().returns(Promise.resolve())
        };

        sandbox.stub(wd, 'promiseRemote');
        wd.promiseRemote.returns(wdRemote);
    });

    afterEach(() => sandbox.restore());

    describe('attach', () => {
        it('should attach the browser with the specified session id', () => {
            return mkExistingBrowser({sessionId: '100500'})
                .attach()
                .then(() => assert.calledWith(wdRemote.attach, '100500'));
        });

        it('should set http timeout for all requests', () => {
            return mkExistingBrowser({config: {httpTimeout: 100500}})
                .attach()
                .then(() => assert.calledWithMatch(wdRemote.configureHttp, {timeout: 100500}));
        });

        it('should return promise with ExistingBrowser instance', () => {
            const browser = mkExistingBrowser().attach();

            return assert.eventually.instanceOf(browser, ExistingBrowser);
        });
    });
});
