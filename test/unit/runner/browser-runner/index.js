'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const BrowserRunner = require('lib/runner/browser-runner');
const BrowserAgent = require('lib/runner/browser-runner/browser-agent');
const SuiteRunner = require('lib/runner/suite-runner/suite-runner');
const suiteRunnerFabric = require('lib/runner/suite-runner');
const createSuite = require('lib/suite').create;
const BasicPool = require('lib/browser-pool/basic-pool');
const Config = require('lib/config');
const SuiteCollection = require('lib/suite-collection');

const makeSuiteStub = require('../../../util').makeSuiteStub;

describe('runner/BrowserRunner', () => {
    const sandbox = sinon.sandbox.create();

    let suiteRunner;

    beforeEach(() => {
        suiteRunner = sinon.createStubInstance(SuiteRunner);
        suiteRunner.run.returns(Promise.resolve());

        sandbox.stub(suiteRunnerFabric, 'create');
        suiteRunnerFabric.create.returns(suiteRunner);
    });

    afterEach(() => sandbox.restore());

    const mkRunner_ = (browser, config) => {
        const configStub = sinon.createStubInstance(Config);
        const browserConfig = _.get(config, 'browser', {});
        configStub.forBrowser.returns(browserConfig);

        return BrowserRunner.create(
            browser || 'default-browser',
            configStub,
            sinon.createStubInstance(BasicPool)
        );
    };

    describe('run', () => {
        let suiteCollection;

        beforeEach(() => {
            suiteCollection = {
                clone: () => suiteCollection,
                allSuites: () => []
            };
        });

        it('should run only suites expected to be run in current browser', () => {
            const someSuite = makeSuiteStub({browsers: ['browser1', 'browser2']});
            const suiteCollection = new SuiteCollection([
                someSuite,
                makeSuiteStub({browsers: ['browser2']})
            ]);
            const runner = mkRunner_('browser1');

            return runner.run(suiteCollection)
                .then(() => {
                    assert.calledOnce(suiteRunnerFabric.create);
                    assert.calledWithMatch(suiteRunnerFabric.create, someSuite);
                });
        });

        it('should pass to suite runner browser agent associated with current browser', () => {
            const browserAgent = new BrowserAgent('browser');
            const suiteCollection = new SuiteCollection([makeSuiteStub({browsers: ['browser']})]);

            sandbox.stub(BrowserAgent, 'create');
            BrowserAgent.create.returns(browserAgent);

            const runner = mkRunner_('browser');

            return runner.run(suiteCollection)
                .then(() => assert.calledWith(suiteRunnerFabric.create, sinon.match.any, browserAgent));
        });

        it('should create browser agent instance for each suite', () => {
            const suiteCollection = new SuiteCollection([
                makeSuiteStub({browsers: ['bro']}),
                makeSuiteStub({browsers: ['bro']})
            ]);
            sandbox.spy(BrowserAgent, 'create');

            return mkRunner_('bro')
                .run(suiteCollection)
                .then(() => {
                    assert.calledTwice(BrowserAgent.create);
                    assert.notEqual(
                        suiteRunnerFabric.create.firstCall.args[1],
                        suiteRunnerFabric.create.secondCall.args[1]
                    );
                });
        });

        it('should passthrough stateProcessor to suite runner', () => {
            const suiteCollection = new SuiteCollection([makeSuiteStub({browsers: ['browser']})]);
            const runner = mkRunner_('browser');

            return runner.run(suiteCollection, 'stateProcessor')
                .then(() => assert.calledWith(suiteRunner.run, 'stateProcessor'));
        });

        it('should cancel suite runners on cancel', () => {
            const runner = mkRunner_('browser');
            const suiteCollection = new SuiteCollection([
                makeSuiteStub({browsers: ['browser']}),
                makeSuiteStub({browsers: ['browser']})
            ]);

            return runner.run(suiteCollection)
                .then(() => {
                    runner.cancel();

                    assert.calledTwice(suiteRunner.cancel);
                });
        });

        describe('add "fullUrl" to suite', () => {
            const makeChildSuiteStub = (browsers) => {
                const parentSuite = makeSuiteStub(browsers);
                return createSuite('child', parentSuite);
            };

            const run_ = (opts) => {
                _.defaults(opts || {}, {
                    browser: 'browser',
                    rootUrl: 'http://default/url'
                });

                const config = {[opts.browser]: {rootUrl: opts.rootUrl}};

                const someSuite = opts.suiteUrl
                    ? makeSuiteStub({browsers: [opts.browser], url: opts.suiteUrl})
                    : makeChildSuiteStub({browsers: [opts.browser]});

                const suiteCollection = new SuiteCollection([someSuite]);
                const runner = mkRunner_(opts.browser, config);

                return runner.run(suiteCollection)
                    .then(() => suiteRunnerFabric.create.args[0][0]); // resolve with modified suite
            };

            it('should not modify suite without "url" as own property', () => {
                return run_({rootUrl: 'http://localhost/foo/bar/'})
                    .then((suite) => assert.isUndefined(suite.fullUrl));
            });

            it('should concatenate rootUrl and suiteUrl', () => {
                return run_({rootUrl: 'http://localhost/foo/bar/', suiteUrl: 'testUrl'})
                    .then((suite) => assert.equal(suite.fullUrl, '/foo/bar/testUrl'));
            });

            it('should concatenate with slash between rootUrl and suiteUrl', () => {
                return run_({rootUrl: 'http://localhost/foo/baz', suiteUrl: 'testUrl'})
                    .then((suite) => assert.equal(suite.fullUrl, '/foo/baz/testUrl'));
            });

            it('should remove consecutive slashes', () => {
                return run_({rootUrl: 'http://localhost/foo/qux/', suiteUrl: '/testUrl'})
                    .then((suite) => assert.equal(suite.fullUrl, '/foo/qux/testUrl'));
            });

            it('should cut latest slashes from url', () => {
                return run_({rootUrl: 'http://localhost/foo/bat/', suiteUrl: 'testUrl//'})
                    .then((suite) => assert.equal(suite.fullUrl, '/foo/bat/testUrl'));
            });
        });
    });
});
