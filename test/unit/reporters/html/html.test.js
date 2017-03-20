'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const Promise = require('bluebird');
const QEmitter = require('qemitter');
const HtmlReporter = require('lib/reporters/html/index.js');
const Events = require('lib/constants/events');
const Handlebars = require('handlebars');
const logger = require('lib/utils').logger;
const chalk = require('chalk');
const path = require('path');
const lib = require('lib/reporters/html/lib');
const view = require('lib/reporters/html/view');

describe('HTML Reporter', () => {
    const sandbox = sinon.sandbox.create();
    let emitter;

    function mkStubResult_(options) {
        return _.defaultsDeep(options, {
            state: {name: 'name-default'},
            browserId: 'browserId-default',
            suite: {
                path: ['suite/path-default'],
                metaInfo: {sessionId: 'sessionId-default'}
            },
            saveDiffTo: sandbox.stub(),
            currentPath: 'current/path-default',
            referencePath: 'reference/path-default',
            equal: false
        });
    }

    function emitResult_(options) {
        emitter.emit(Events.TEST_RESULT, mkStubResult_(options));
        emitter.emit(Events.END);
        return emitter.emitAndWait(Events.END_RUNNER);
    }

    beforeEach(() => {
        sandbox.stub(view, 'save');
        sandbox.stub(logger, 'log');
        sandbox.stub(fs, 'copyAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());

        emitter = new QEmitter();
        emitter.config = {
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url'
            })
        };
    });

    afterEach(() => sandbox.restore());

    it('should log correct path to html report', () => {
        // calling constructor for its side effect
        new HtmlReporter(emitter); // eslint-disable-line no-new
        emitter.emit(Events.END);

        return emitter.emitAndWait(Events.END_RUNNER).then(() => {
            const reportPath = `file://${path.resolve('gemini-report/index.html')}`;
            assert.calledWith(logger.log, `Your HTML report is here: ${chalk.yellow(reportPath)}`);
        });
    });

    it('should escape special chars in urls', () => {
        // calling constructor for its side effect
        new HtmlReporter(emitter); // eslint-disable-line no-new
        const data = {
            actualPath: 'images/fake/long+path/fakeName/fakeId~current.png'
        };

        const render = Handlebars.compile('{{image "actual"}}');

        assert.equal(render(data), '<img data-src="images/fake/long%2Bpath/fakeName/fakeId~current.png">');
    });

    describe('with --html-failed-only flag', () => {
        beforeEach(() => {
            // calling constructor for its side effect
            new HtmlReporter(emitter, {failedOnly: true}); // eslint-disable-line no-new
        });

        it('should not save reference when screenshots are equal', () => {
            sandbox.stub(lib, 'referenceAbsolutePath').returns('absolute/reference/path');

            emitter.emit(Events.TEST_RESULT, mkStubResult_({
                referencePath: 'reference/path',
                equal: true
            }));

            emitter.emit(Events.END);

            return emitter.emitAndWait(Events.END_RUNNER).then(() => {
                assert.notCalled(fs.copyAsync);
            });
        });

        describe('when screenshots are not equal', () => {
            it('should save current image', () => {
                sandbox.stub(lib, 'currentAbsolutePath').returns('/absolute/report/current/path');

                return emitResult_({currentPath: 'current/path'})
                    .then(() => {
                        assert.calledWith(fs.copyAsync, 'current/path', '/absolute/report/current/path');
                    });
            });

            it('should save reference image', () => {
                sandbox.stub(lib, 'referenceAbsolutePath').returns('/absolute/report/reference/path');

                return emitResult_({referencePath: 'reference/path'})
                    .then(() => {
                        assert.calledWith(fs.copyAsync, 'reference/path', '/absolute/report/reference/path');
                    });
            });

            it('should save diff image', () => {
                const saveDiffTo = sandbox.stub();

                sandbox.stub(lib, 'diffAbsolutePath').returns('/absolute/report/diff/path');

                return emitResult_({saveDiffTo})
                    .then(() => {
                        assert.calledWith(saveDiffTo, '/absolute/report/diff/path');
                    });
            });
        });
    });

    describe('without --html-failed-only flag', () => {
        beforeEach(() => {
            // calling constructor for its side effect
            new HtmlReporter(emitter, {failedOnly: false}); // eslint-disable-line no-new
        });

        it('should save only reference when screenshots are equal', () => {
            sandbox.stub(lib, 'referenceAbsolutePath').returns('absolute/reference/path');

            emitter.emit(Events.TEST_RESULT, mkStubResult_({
                referencePath: 'reference/path',
                equal: true
            }));

            emitter.emit(Events.END);

            return emitter.emitAndWait(Events.END_RUNNER).then(() => {
                assert.calledOnce(fs.copyAsync);
                assert.calledWith(fs.copyAsync, 'reference/path', 'absolute/reference/path');
            });
        });

        describe('when screenshots are not equal', () => {
            it('should save current image', () => {
                sandbox.stub(lib, 'currentAbsolutePath').returns('/absolute/report/current/path');

                return emitResult_({currentPath: 'current/path'})
                    .then(() => {
                        assert.calledWith(fs.copyAsync, 'current/path', '/absolute/report/current/path');
                    });
            });

            it('should save reference image', () => {
                sandbox.stub(lib, 'referenceAbsolutePath').returns('/absolute/report/reference/path');

                return emitResult_({referencePath: 'reference/path'})
                    .then(() => {
                        assert.calledWith(fs.copyAsync, 'reference/path', '/absolute/report/reference/path');
                    });
            });

            it('should save diff image', () => {
                const saveDiffTo = sandbox.stub();

                sandbox.stub(lib, 'diffAbsolutePath').returns('/absolute/report/diff/path');

                return emitResult_({saveDiffTo})
                    .then(() => {
                        assert.calledWith(saveDiffTo, '/absolute/report/diff/path');
                    });
            });
        });
    });
});
