'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');

const Config = require('lib/config');
const plugins = require('lib/plugins');
const Runner = require('lib/runner');
const Events = require('lib/constants/events');
const SuiteCollection = require('lib/suite-collection');
const temp = require('lib/temp');

const mkSuiteStub = require('../util').makeSuiteStub;
const mkStateStub = require('../util').makeStateStub;

describe('gemini', () => {
    const sandbox = sinon.sandbox.create();

    let Gemini;
    let gemini;
    let testReaderStub;

    const stubBrowsers = (browserIds) => {
        return browserIds.reduce((fakeBrowsers, browser) => {
            return _.set(fakeBrowsers, browser, {desiredCapabilities: {}});
        }, {});
    };

    const initGemini = (opts) => {
        opts.rootSuite = opts.rootSuite || mkSuiteStub();

        testReaderStub = sandbox.stub().named('TestReader').returns(Promise.resolve(opts.rootSuite));

        Gemini = proxyquire('lib/gemini', {'./test-reader': testReaderStub});

        return new Gemini({
            rootUrl: 'http://localhost',
            system: {
                projectRoot: 'stub/project/root',
                tempDir: opts.tempDir || 'stub/temp/dir'
            },
            browsers: opts.browserIds ? stubBrowsers(opts.browserIds) : []
        });
    };

    const runGeminiTest = (opts) => {
        opts = _.defaults(opts || {}, {
            browserIds: []
        });

        gemini = initGemini(opts);
        gemini.config.sets = opts.sets;

        return gemini.test([], opts.cliOpts);
    };

    beforeEach(() => {
        sandbox.stub(Runner.prototype, 'on').returnsThis();
        sandbox.stub(Runner.prototype, 'run').returns(Promise.resolve());
        sandbox.stub(console, 'warn');
        sandbox.stub(plugins, 'load');
    });

    afterEach(() => sandbox.restore());

    it('should passthrough runner events', () => {
        sandbox.stub(temp, 'init');

        const runner = new EventEmitter();
        sandbox.stub(Runner, 'create').returns(runner);

        const gemini = initGemini({});
        gemini.test();

        [
            Events.START_RUNNER,
            Events.END_RUNNER,
            Events.BEGIN,
            Events.END,

            Events.BEGIN_SESSION,
            Events.END_SESSION,

            Events.RETRY,

            Events.START_BROWSER,
            Events.STOP_BROWSER,

            Events.BEGIN_SUITE,
            Events.END_SUITE,

            Events.SKIP_STATE,
            Events.BEGIN_STATE,
            Events.END_STATE,

            Events.INFO,
            Events.WARNING,
            Events.ERROR,

            Events.END_TEST,
            Events.CAPTURE,

            Events.TEST_RESULT,
            Events.UPDATE_RESULT
        ].forEach((event, name) => {
            const spy = sinon.spy().named(`${name} handler`);
            gemini.on(event, spy);

            runner.emit(event, 'value');

            assert.calledOnce(spy);
            assert.calledWith(spy, 'value');
        });
    });

    describe('readTests', () => {
        const readTests_ = (rootSuite, options) => {
            gemini = initGemini({rootSuite});

            return gemini.readTests(null, options);
        };

        beforeEach(() => {
            sandbox.stub(temp, 'init');
            sandbox.stub(Config.prototype);
        });

        it('should pass sets from cli to test-reader', () => {
            const opts = {
                cliOpts: {sets: ['set1']}
            };

            return runGeminiTest(opts)
                .then(() => {
                    assert.calledWithMatch(testReaderStub, sinon.match({sets: ['set1']}));
                });
        });

        it('should return SuiteCollection instance', () => {
            return readTests_()
                .then((result) => {
                    assert.instanceOf(result, SuiteCollection);
                });
        });

        it('should add to suite collection all read tests excluding root', () => {
            const parent = mkSuiteStub();
            const child = mkSuiteStub({parent: parent});
            const anotherChild = mkSuiteStub({parent: parent});

            parent.addChild(child);
            parent.addChild(anotherChild);

            return readTests_(parent)
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.notInclude(allSuites, parent);
                    assert.include(allSuites, child);
                    assert.include(allSuites, anotherChild);
                });
        });

        it('should grep leaf suites by fullname', () => {
            const grandParent = mkSuiteStub();
            const parent = mkSuiteStub({parent: grandParent});
            grandParent.addChild(parent);
            const matchingChild = mkSuiteStub({
                states: [mkStateStub()],
                name: 'ok',
                parent: parent
            });
            const nonMatchingChild = mkSuiteStub({
                states: [mkStateStub()],
                name: 'fail',
                parent: parent
            });
            parent.addChild(matchingChild);
            parent.addChild(nonMatchingChild);

            return readTests_(parent, {grep: /ok/})
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.include(allSuites, matchingChild);
                    assert.notInclude(allSuites, nonMatchingChild);
                });
        });

        it('should remove tree branch if it does not have leaf suites', () => {
            const grandParent = mkSuiteStub();
            const parent = mkSuiteStub({parent: grandParent});
            const nonMatchingBranchRoot = mkSuiteStub({
                name: 'nonMatchingBranchRoot',
                parent: parent
            });
            const nonMatchingBranchLeaf = mkSuiteStub({
                states: [mkStateStub()],
                name: 'nonMatchingBranchLeaf',
                parent: nonMatchingBranchRoot
            });

            return readTests_(grandParent, {grep: /matchingBranchLeaf/})
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.notInclude(allSuites, nonMatchingBranchRoot);
                    assert.notInclude(allSuites, nonMatchingBranchLeaf);
                });
        });

        it('should keep in tree branch that have matching leaf suites', () => {
            const grandParent = mkSuiteStub();
            const parent = mkSuiteStub({parent: grandParent});
            grandParent.addChild(parent);
            const matchingBranchRoot = mkSuiteStub({
                name: 'matchingBranchRoot',
                parent: parent
            });
            parent.addChild(matchingBranchRoot);
            const matchingBranchLeaf = mkSuiteStub({
                states: [mkStateStub()],
                name: 'matchingBranchLeaf',
                parent: matchingBranchRoot
            });
            matchingBranchRoot.addChild(matchingBranchLeaf);

            return readTests_(grandParent, {grep: /matchingBranchLeaf/})
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.include(allSuites, matchingBranchRoot);
                    assert.include(allSuites, matchingBranchLeaf);
                });
        });

        it('should warn if RegExp was passed instead of object', () => {
            return readTests_(null, new RegExp(/string/))
                .then(() => assert.calledWith(console.warn, sinon.match(
                    'Passing grep to readTests is deprecated. You should pass an object with options: {grep: /string/}.'
                )));
        });
    });

    describe('test', () => {
        beforeEach(function() {
            sandbox.stub(temp, 'init');
        });

        it('should initialize temp with specified temp dir', () => {
            runGeminiTest({tempDir: '/some/dir'});

            assert.calledOnce(temp.init);
            assert.calledWith(temp.init, '/some/dir');
        });

        it('should initialize temp before start runner', () => {
            return runGeminiTest()
                .then(() => {
                    assert.callOrder(
                        temp.init,
                        Runner.prototype.run
                    );
                });
        });
    });

    describe('environment variables', () => {
        beforeEach(() => {
            sandbox.stub(SuiteCollection.prototype, 'skipBrowsers');
            sandbox.stub(Runner.prototype, 'setTestBrowsers');
            sandbox.stub(temp, 'init');
        });

        afterEach(() => {
            delete process.env.GEMINI_BROWSERS;
            delete process.env.GEMINI_SKIP_BROWSERS;
        });

        it('should use browsers from GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => assert.calledWith(Runner.prototype.setTestBrowsers, ['b1']));
        });

        it('should handle spaces in value of GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1, b2';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => assert.calledWith(Runner.prototype.setTestBrowsers, ['b1', 'b2']));
        });

        it('should warn about unknown browsers in GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1, b2';

            return runGeminiTest({browserIds: ['b1']})
                .then(() => {
                    assert.calledWith(console.warn, sinon.match('Unknown browsers id: b2'));
                });
        });

        it('should not set tests browsers if browsers are not specified from cli option and env variable', () => {
            return runGeminiTest()
                .then(() => assert.notCalled(Runner.prototype.setTestBrowsers));
        });

        it('should skip browsers from GEMINI_SKIP_BROWSERS', () => {
            process.env.GEMINI_SKIP_BROWSERS = 'b1';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => assert.calledWith(SuiteCollection.prototype.skipBrowsers, ['b1']));
        });

        it('should remove spaces from GEMINI_SKIP_BROWSERS', () => {
            process.env.GEMINI_SKIP_BROWSERS = 'b1, b2';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => assert.calledWith(SuiteCollection.prototype.skipBrowsers, ['b1', 'b2']));
        });

        it('should warn about unknown browsers in GEMINI_SKIP_BROWSERS', () => {
            process.env.GEMINI_SKIP_BROWSERS = 'b1,b2';

            return runGeminiTest({browserIds: ['b1']})
                .then(() => assert.calledWith(console.warn, sinon.match('Unknown browsers id: b2')));
        });
    });
});
