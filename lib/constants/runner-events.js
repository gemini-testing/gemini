'use strict';

module.exports = {
    START_RUNNER: 'startRunner',
    END_RUNNER: 'endRunner',

    BEGIN: 'begin',
    END: 'end',

    BEGIN_SESSION: 'beginSession',
    END_SESSION: 'endSession',

    RETRY: 'retry',

    START_BROWSER: 'startBrowser',
    STOP_BROWSER: 'stopBrowser',

    BEGIN_SUITE: 'beginSuite',
    END_SUITE: 'endSuite',

    SKIP_STATE: 'skipState',
    BEGIN_STATE: 'beginState',
    END_STATE: 'endState',

    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'err', // unable to call it `error` because `error` handling is a special case for EventEmitter

    END_TEST: 'endTest',
    CAPTURE: 'capture'
};
