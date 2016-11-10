'use strict';

const EventEmitter = require('events').EventEmitter;
const Events = require('./constants/events');
const logger = require('./utils').logger;

const signalHandler = module.exports = new EventEmitter();

process.on('SIGHUP', handleSignal(1));
process.on('SIGINT', handleSignal(2));
process.on('SIGTERM', handleSignal(15));

let callCount = 0;

function handleSignal(signalNo) {
    const exitCode = 128 + signalNo;

    return () => {
        if (callCount++ > 0) {
            logger.warn('Force quit.');
            process.exit(exitCode);
        }

        logger.warn('Cancelling...');
        signalHandler.emit(Events.INTERRUPT, {exitCode});
    };
}
