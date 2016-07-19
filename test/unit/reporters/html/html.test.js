'use strict';

const EventEmitter = require('events').EventEmitter;
const HtmlReporter = require('lib/reporters/html/index.js');
const RunnerEvents = require('lib/constants/runner-events');
const logger = require('lib/utils').logger;
const chalk = require('chalk');
const path = require('path');
const view = require('lib/reporters/html/view');
const lib = require('lib/reporters/html/lib');

describe('HTML Reporter', () => {
    const sandbox = sinon.sandbox.create();
    let emitter;

    beforeEach(() => {
        sandbox.stub(view, 'save');

        emitter = new EventEmitter();

        // calling constructor for its side effect
        new HtmlReporter(emitter); // eslint-disable-line no-new
    });

    afterEach(() => sandbox.restore());

    it('should log correct path to html report', () => {
        sandbox.stub(logger, 'log');

        emitter.emit(RunnerEvents.END);

        const reportPath = `file://${path.resolve('gemini-report/index.html')}`;
        assert.calledWith(logger.log, `Your HTML report is here: ${chalk.yellow(reportPath)}`);
    });

    it('should escape special chars in paths', () => {
        const data = {
            suite: {
                path: 'fake/long+path'
            },
            state: {
                name: 'fakeName'
            },
            browserId: 'fakeId'
        };

        assert.equal(lib.currentPath(data), 'images/fake/long%2Bpath/fakeName/fakeId~current.png');
    });
});
