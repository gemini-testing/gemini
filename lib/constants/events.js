'use strict';

module.exports = {
    AFTER_TESTS_READ: 'afterTestsRead',

    START_RUNNER: 'startRunner',
    END_RUNNER: 'endRunner',

    BEGIN: 'begin',
    END: 'end',

    BEGIN_SESSION: 'beginSession', // Deprecated, will be removed in the next major version - 5.0.0
    END_SESSION: 'endSession', // Deprecated, will be removed in the next major version - 5.0.0

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

    END_TEST: 'endTest', // Deprecated, will be removed in the next major version - 5.0.0
    CAPTURE: 'capture', // Deprecated, will be removed in the next major version - 5.0.0

    TEST_RESULT: 'testResult',
    UPDATE_RESULT: 'updateResult',

    BEFORE_FILE_READ: 'beforeFileRead',
    AFTER_FILE_READ: 'afterFileRead',

    INTERRUPT: 'interrupt'
};
