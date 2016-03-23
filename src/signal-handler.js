'use strict';

var QEmitter = require('qemitter'),
    signalHandler = new QEmitter();

module.exports = signalHandler;

process.on('SIGHUP', notifyAndExit(1));
process.on('SIGINT', notifyAndExit(2));
process.on('SIGTERM', notifyAndExit(15));

var callCount = 0;

function notifyAndExit(signalNo) {
    var exitCode = 128 + signalNo;

    return function() {
        if (callCount++ > 0) {
            console.log('Force quit.');
            process.exit(exitCode);
        }

        signalHandler.emitAndWait('exit')
            .then(function() {
                console.log('Done.');
                process.exit(exitCode);
            })
            .done();
    };
}
