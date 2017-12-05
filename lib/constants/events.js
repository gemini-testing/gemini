'use strict';

module.exports = {
    CLI: 'cli',
    INIT: 'init',

    AFTER_TESTS_READ: 'afterTestsRead',

    START_RUNNER: 'startRunner',
    END_RUNNER: 'endRunner',

    BEGIN: 'begin',
    END: 'end',

    RETRY: 'retry',

    START_BROWSER: 'startBrowser',
    STOP_BROWSER: 'stopBrowser',

    BEGIN_SUITE: 'beginSuite',
    END_SUITE: 'endSuite',

    SKIP_STATE: 'skipState',
    BEGIN_STATE: 'beginState',
    END_STATE: 'endState',

    INFO: 'info',
    ERROR: 'err', // unable to call it `error` because `error` handling is a special case for EventEmitter

    TEST_RESULT: 'testResult',
    UPDATE_RESULT: 'updateResult',

    BEFORE_FILE_READ: 'beforeFileRead',
    AFTER_FILE_READ: 'afterFileRead',

    INTERRUPT: 'interrupt'
};
