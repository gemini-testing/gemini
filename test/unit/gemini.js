'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');
const pluginsLoader = require('plugins-loader');

const Config = require('lib/config');
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
    let signalHandler;

    const stubBrowsers = (browserIds) => {
        return browserIds.reduce((fakeBrowsers, browser) => {
            return _.set(fakeBrowsers, browser, {desiredCapabilities: {}});
        }, {});
    };

    const initGemini = (opts) => {
        opts = opts || {};

        opts.rootSuite = opts.rootSuite || mkSuiteStub();

        testReaderStub = sandbox.stub().named('TestReader').returns(Promise.resolve(opts.rootSuite));
        signalHandler = new EventEmitter();

        Gemini = proxyquire('lib/gemini', {
            './test-reader': testReaderStub,
            './signal-handler': signalHandler
        });

        return new Gemini({
            rootUrl: 'http://localhost',
            system: {
                projectRoot: 'stub/project/root',
                tempDir: opts.tempDir || 'stub/temp/dir',
                plugins: opts.plugins || {}
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
        sandbox.stub(Runner.prototype, 'cancel').returns(Promise.resolve());
        sandbox.stub(console, 'warn');
        sandbox.stub(pluginsLoader, 'load').returns([]);
        sandbox.stub(temp, 'init');
    });

    afterEach(() => sandbox.restore());

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
    ].forEach((event) => {
        it(`should passthrough '${event}' runner event`, () => {
            const runner = new EventEmitter();
            runner.run = () => {
                runner.emit(event, 'foo');
                return Promise.resolve();
            };
            sandbox.stub(Runner, 'create').returns(runner);

            const gemini = initGemini({});
            const spy = sinon.spy();
            gemini.on(event, spy);

            return gemini.test()
                .then(() => assert.calledOnceWith(spy, 'foo'));
        });
    });

    it('should return statistic after the tests are completed', () => {
        sandbox.stub(Runner.prototype, 'run').callsFake(function() {
            this.emit(Events.END, {foo: 'bar'});
            return Promise.resolve();
        });
        const gemini = initGemini({});

        return gemini.test()
            .then((stats) => assert.deepEqual(stats, {foo: 'bar'}));
    });

    describe('load plugins', () => {
        it('should load plugins', () => {
            return runGeminiTest()
                .then(() => assert.calledOnce(pluginsLoader.load));
        });

        it('should load plugins before reading tests', () => {
            return runGeminiTest()
                .then(() => assert.callOrder(pluginsLoader.load, testReaderStub));
        });

        it('should load plugins for gemini instance', () => {
            const gemini = initGemini();

            return gemini.test()
                .then(() => assert.calledWith(pluginsLoader.load, gemini));
        });

        it('should load plugins from config', () => {
            return runGeminiTest({plugins: {'some-plugin': true}})
                .then(() => assert.calledWith(pluginsLoader.load, sinon.match.any, {'some-plugin': true}));
        });

        it('should load plugins with appropriate prefix', () => {
            const prefix = require('../../package').name + '-';

            return runGeminiTest()
                .then(() => assert.calledWith(pluginsLoader.load, sinon.match.any, sinon.match.any, prefix));
        });

        it('should wait until plugins loaded', () => {
            const afterPluginLoad = sinon.spy();
            pluginsLoader.load.callsFake(() => {
                return [Promise.delay(20).then(afterPluginLoad)];
            });
            sandbox.stub(Runner.prototype, 'run').returns(Promise.resolve());

            return runGeminiTest()
                .then(() => assert.callOrder(afterPluginLoad, Runner.prototype.run));
        });

        it('should not run tests if plugin failed on load', () => {
            const err = new Error('o.O');
            pluginsLoader.load.callsFake(() => [Promise.reject(err)]);
            sandbox.stub(Runner.prototype, 'run').returns(Promise.resolve());

            const result = runGeminiTest();

            return assert.isRejected(result, err)
                .then(() => assert.notCalled(Runner.prototype.run));
        });

        it('should load plugins only once', () => {
            const gemini = initGemini();

            return gemini.readTests()
                .then((collection) => gemini.test(collection))
                .then(() => assert.calledOnce(pluginsLoader.load));
        });
    });

    describe('readTests', () => {
        const readTests_ = (rootSuite, options) => {
            gemini = initGemini({rootSuite});

            return gemini.readTests(null, options);
        };

        beforeEach(() => {
            sandbox.stub(Config.prototype);

            Config.prototype.getBrowserIds.returns([]);
        });

        it('should pass sets from cli to test-reader', () => {
            const opts = {
                cliOpts: {sets: ['set1']}
            };

            return runGeminiTest(opts)
                .then(() => {
                    assert.calledWithMatch(testReaderStub,
                        sinon.match.any,
                        sinon.match.any,
                        sinon.match({sets: ['set1']})
                    );
                });
        });

        it('should pass browsers from cli to test-reader', () => {
            const opts = {
                cliOpts: {browsers: ['bro1']}
            };

            return runGeminiTest(opts)
                .then(() => {
                    assert.calledWithMatch(testReaderStub,
                        sinon.match.any,
                        sinon.match.any,
                        sinon.match({browsers: ['bro1']})
                    );
                });
        });

        it('should return SuiteCollection instance', () => {
            return readTests_()
                .then((result) => assert.instanceOf(result, SuiteCollection));
        });

        it('should emit AFTER_TESTS_READ event with created suite collection', () => {
            const onAfterTestRead = sinon.spy();
            gemini = initGemini();
            gemini.on(Events.AFTER_TESTS_READ, onAfterTestRead);

            return gemini.readTests()
                .then((suiteCollection) => assert.calledOnceWith(onAfterTestRead, {suiteCollection}));
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
    });

    describe('test', () => {
        beforeEach(() => {
            sandbox.stub(Runner.prototype, 'run').returns(Promise.resolve());
        });

        it('should initialize temp with specified temp dir', () => {
            return runGeminiTest({tempDir: '/some/dir'})
                .then(() => assert.calledOnceWith(temp.init, '/some/dir'));
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

        it('should emit AFTER_TESTS_READ event with suite collection', () => {
            const onAfterTestRead = sinon.spy();
            gemini = initGemini();
            gemini.on(Events.AFTER_TESTS_READ, onAfterTestRead);

            return gemini.test()
                .then(() => assert.calledOnceWith(onAfterTestRead, {suiteCollection: sinon.match.instanceOf(SuiteCollection)}));
        });
    });

    describe('environment variables', () => {
        beforeEach(() => {
            sandbox.stub(SuiteCollection.prototype, 'skipBrowsers');
        });

        afterEach(() => {
            delete process.env.GEMINI_BROWSERS;
            delete process.env.GEMINI_SKIP_BROWSERS;
        });

        it('should use browsers from GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => {
                    assert.calledWithMatch(testReaderStub,
                        sinon.match.any,
                        sinon.match.any,
                        {browsers: ['b1']}
                    );
                });
        });

        it('should handle spaces in value of GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1, b2';

            return runGeminiTest({browserIds: ['b1', 'b2']})
                .then(() => {
                    assert.calledWithMatch(testReaderStub,
                        sinon.match.any,
                        sinon.match.any,
                        {browsers: ['b1', 'b2']}
                    );
                });
        });

        it('should warn about unknown browsers in GEMINI_BROWSERS', () => {
            process.env.GEMINI_BROWSERS = 'b1, b2';

            return runGeminiTest({browserIds: ['b1']})
                .then(() => {
                    assert.calledWith(console.warn, sinon.match('Unknown browsers id: b2'));
                });
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

    describe('readRawConfig', () => {
        beforeEach(() => {
            sandbox.stub(Config, 'readRawConfig');
        });

        it('should read configuration object from file by given path', () => {
            Config.readRawConfig
                .withArgs('some/file/path')
                .returns({foo: 'bar'});

            assert.deepEqual(Gemini.readRawConfig('some/file/path'), {foo: 'bar'});
        });
    });

    describe('on "INTERRUPT"', () => {
        const stubRunner = (scenario) => {
            sandbox.stub(Runner.prototype, 'run').callsFake(() => Promise.resolve(scenario()));
        };

        const emulateRunnerInterrupt = (exitCode) => stubRunner(() => signalHandler.emit(Events.INTERRUPT, {exitCode}));

        it('should emit "INTERRUPT" event from gemini', () => {
            const gemini = initGemini();
            const onCancel = sinon.spy().named('onCancel');

            emulateRunnerInterrupt();

            gemini.on(Events.INTERRUPT, onCancel);

            return gemini.test()
                .then(() => assert.calledOnce(onCancel));
        });

        it('should pass exit code when emitting "INTERRUPT" event', () => {
            const gemini = initGemini();
            const onCancel = sinon.spy().named('onCancel');

            emulateRunnerInterrupt(130);

            gemini.on(Events.INTERRUPT, onCancel);

            return gemini.test()
                .then(() => assert.calledWith(onCancel, {exitCode: 130}));
        });

        it('should cancel gemini runner', () => {
            const gemini = initGemini();

            emulateRunnerInterrupt();

            return gemini.test()
                .then(() => assert.calledOnce(Runner.prototype.cancel));
        });

        it('should emit "INTERRUPT" event from gemini before cancelling of gemini runner', () => {
            const gemini = initGemini();
            const onCancel = sinon.spy().named('onCancel');

            emulateRunnerInterrupt();

            gemini.on(Events.INTERRUPT, onCancel);

            return gemini.test()
                .then(() => assert.callOrder(onCancel, Runner.prototype.cancel));
        });
    });
});
