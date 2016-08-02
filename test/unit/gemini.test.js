'use strict';

const q = require('q');
const proxyquire = require('proxyquire');
const SuiteCollection = require('lib/suite-collection');
const Config = require('lib/config');
const Runner = require('lib/runner');
const temp = require('lib/temp');

const mkSuiteStub = require('../util').makeSuiteStub;

describe('gemini', () => {
    const sandbox = sinon.sandbox.create();

    let Gemini = require('lib/gemini');

    afterEach(() => sandbox.restore());

    describe('readTests', () => {
        const readTests_ = (rootSuite, grep) => {
            rootSuite = rootSuite || mkSuiteStub();

            const testReaderStub = sandbox.stub().named('TestReader').returns(q(rootSuite));
            const Gemini = proxyquire('lib/gemini', {
                './test-reader': testReaderStub
            });

            return new Gemini({
                rootUrl: 'stubRootUrl',
                system: {projectRoot: 'stubProjectRoot'}
            })
            .readTests(null, grep);
        };

        beforeEach(() => sandbox.stub(Config.prototype));

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
            const matchingChild = mkSuiteStub({
                states: [1],
                name: 'ok',
                parent: parent
            });
            const nonMatchingChild = mkSuiteStub({
                states: [1],
                name: 'fail',
                parent: parent
            });

            return readTests_(parent, /ok/)
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
                states: [1],
                name: 'nonMatchingBranchLeaf',
                parent: nonMatchingBranchRoot
            });

            return readTests_(grandParent, /matchingBranchLeaf/)
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.notInclude(allSuites, nonMatchingBranchRoot);
                    assert.notInclude(allSuites, nonMatchingBranchLeaf);
                });
        });

        it('should keep in tree branch that have matching leaf suites', () => {
            const grandParent = mkSuiteStub();
            const parent = mkSuiteStub({parent: grandParent});
            const matchingBranchRoot = mkSuiteStub({
                name: 'matchingBranchRoot',
                parent: parent
            });
            const matchingBranchLeaf = mkSuiteStub({
                states: [1],
                name: 'matchingBranchLeaf',
                parent: matchingBranchRoot
            });

            return readTests_(grandParent, /matchingBranchLeaf/)
                .then((collection) => {
                    const allSuites = collection.allSuites();

                    assert.include(allSuites, matchingBranchRoot);
                    assert.include(allSuites, matchingBranchLeaf);
                });
        });
    });

    describe('test', () => {
        beforeEach(() => sandbox.stub(temp));

        const test_ = (opts) => {
            opts = opts || {};
            const Gemini = require('lib/gemini');

            Runner.prototype.on.returnsThis();
            Runner.prototype.run.returns(q());

            return new Gemini({
                rootUrl: 'stubRootUrl',
                system: {
                    projectRoot: 'stubProjectRoot',
                    tempDir: opts.tempDir
                }
            })
            .test([]);
        };

        it('should initialize temp with specified temp dir', () => {
            test_({tempDir: '/some/dir'});

            assert.calledOnce(temp.init);
            assert.calledWith(temp.init, '/some/dir');
        });

        it('should initialize temp before start runner', () => {
            return test_()
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
            sandbox.stub(Runner.prototype, 'on');
            sandbox.stub(Runner.prototype, 'run');
            sandbox.stub(Runner.prototype, 'setTestBrowsers');
            sandbox.stub(console, 'warn');
            sandbox.stub(temp, 'init');
        });

        const stubBrowsers = (browserIds) => {
            const fakeBrowsers = {};

            browserIds.map((browser) => {
                fakeBrowsers[browser] = {
                    desiredCapabilities: {}
                };
            });

            return fakeBrowsers;
        };

        const runGeminiTest = (opts) => {
            opts = opts || {};

            const gemini = new Gemini({
                rootUrl: 'stubRootUrl',
                system: {
                    projectRoot: 'stubProjectRoot',
                    tempDir: opts.tempDir
                },
                browsers: stubBrowsers(opts.browserIds)
            });

            Runner.prototype.on.returnsThis();
            Runner.prototype.run.returns(q());

            return gemini.test([]);
        };

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
