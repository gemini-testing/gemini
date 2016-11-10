'use strict';

const _ = require('lodash');
const Events = require('lib/constants/events');
const signalHandler = require('lib/signal-handler');
const logger = require('lib/utils').logger;

describe('SignalHandler', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(logger, 'warn');

        sandbox.stub(process, 'exit');
    });

    afterEach(() => sandbox.restore());

    after(() => {
        process.removeAllListeners('SIGHUP');
        process.removeAllListeners('SIGTERM');
    });

    // SIGINT can not be tested as SIGTERM or SIGINT because mocha subscribes to SIGINT before running of tests
    _.forEach({SIGHUP: 1, SIGTERM: 15}, (code, signal) => {
        describe(`on ${signal}`, () => {
            it('should emit "INTERRUPT" event', () => {
                const onInterrupt = sinon.spy().named('onInterrupt');

                signalHandler.on(Events.INTERRUPT, onInterrupt);
                process.emit(`${signal}`);

                assert.calledOnce(onInterrupt);
            });

            it('should pass exit code', () => {
                const onInterrupt = sinon.spy().named('onExit');

                signalHandler.on(Events.INTERRUPT, onInterrupt);
                process.emit(`${signal}`);

                assert.calledWith(onInterrupt, {exitCode: 128 + code});
            });

            it(`should provide force exit on double ${signal}`, () => {
                process.emit(`${signal}`);
                process.emit(`${signal}`);

                assert.calledWith(process.exit, 128 + code);
            });
        });
    });
});
