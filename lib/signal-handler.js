'use strict';

var QEmitter = require('qemitter'),
    signalHandler = new QEmitter();

module.exports = signalHandler;

process.on('SIGHUP', notifyAndExit(1));
process.on('SIGINT', notifyAndExit(2));
process.on('SIGTERM', notifyAndExit(15));

function notifyAndExit(signalNo) {
    return function() {
        signalHandler.emitAndWait('exit')
            .then(function() {
                console.log('Done.');
                process.exit(128 + signalNo);
            })
            .done();
    };
}
