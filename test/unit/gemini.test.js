'use strict';

var q = require('q'),
    proxyquire = require('proxyquire'),
    SuiteCollection = require('lib/suite-collection'),
    Config = require('lib/config'),
    Runner = require('lib/runner'),
    temp = require('lib/temp'),

    mkSuiteStub = require('../util').makeSuiteStub;

describe('gemini', function() {
    var sandbox = sinon.sandbox.create();

    afterEach(function() {
        sandbox.restore();
    });

    describe('readTests', function() {
        function readTests_(rootSuite, grep) {
            rootSuite = rootSuite || mkSuiteStub();

            var testReaderStub = sandbox.stub().named('TestReader').returns(q(rootSuite)),
                Gemini = proxyquire('lib/gemini', {
                    './test-reader': testReaderStub
                });

            return new Gemini({
                rootUrl: 'stubRootUrl',
                system: {projectRoot: 'stubProjectRoot'}
            })
                .readTests(null, grep);
        }

        beforeEach(function() {
            sandbox.stub(Config.prototype);
        });

        it('should return SuiteCollection instance', function() {
            return readTests_()
                .then(function(result) {
                    assert.instanceOf(result, SuiteCollection);
                });
        });

        it('should add to suite collection all read tests excluding root', function() {
            var parent = mkSuiteStub(),
                child = mkSuiteStub({parent: parent}),
                anotherChild = mkSuiteStub({parent: parent});

            return readTests_(parent)
                .then(function(collection) {
                    var allSuites = collection.allSuites();

                    assert.notInclude(allSuites, parent);
                    assert.include(allSuites, child);
                    assert.include(allSuites, anotherChild);
                });
        });

        it('should grep leaf suites by fullname', function() {
            var grandParent = mkSuiteStub(),
                parent = mkSuiteStub({parent: grandParent}),
                matchingChild = mkSuiteStub({
                    states: [1],
                    name: 'ok',
                    parent: parent
                }),
                nonMatchingChild = mkSuiteStub({
                    states: [1],
                    name: 'fail',
                    parent: parent
                });

            return readTests_(parent, /ok/)
                .then(function(collection) {
                    var allSuites = collection.allSuites();

                    assert.include(allSuites, matchingChild);
                    assert.notInclude(allSuites, nonMatchingChild);
                });
        });

        it('should remove tree branch if it does not have leaf suites', function() {
            var grandParent = mkSuiteStub(),
                parent = mkSuiteStub({parent: grandParent}),
                nonMatchingBranchRoot = mkSuiteStub({
                    name: 'nonMatchingBranchRoot',
                    parent: parent
                }),
                nonMatchingBranchLeaf = mkSuiteStub({
                    states: [1],
                    name: 'nonMatchingBranchLeaf',
                    parent: nonMatchingBranchRoot
                });

            return readTests_(grandParent, /matchingBranchLeaf/)
                .then(function(collection) {
                    var allSuites = collection.allSuites();

                    assert.notInclude(allSuites, nonMatchingBranchRoot);
                    assert.notInclude(allSuites, nonMatchingBranchLeaf);
                });
        });

        it('should keep in tree branch that have matching leaf suites', function() {
            var grandParent = mkSuiteStub(),
                parent = mkSuiteStub({parent: grandParent}),
                matchingBranchRoot = mkSuiteStub({
                    name: 'matchingBranchRoot',
                    parent: parent
                }),
                matchingBranchLeaf = mkSuiteStub({
                    states: [1],
                    name: 'matchingBranchLeaf',
                    parent: matchingBranchRoot
                });

            return readTests_(grandParent, /matchingBranchLeaf/)
                .then(function(collection) {
                    var allSuites = collection.allSuites();

                    assert.include(allSuites, matchingBranchRoot);
                    assert.include(allSuites, matchingBranchLeaf);
                });
        });
    });

    describe('test', function() {
        beforeEach(function() {
            sandbox.stub(temp);
            sandbox.stub(Runner.prototype, 'on');
            sandbox.stub(Runner.prototype, 'run');
        });

        function test_(opts) {
            opts = opts || {};
            var Gemini = require('lib/gemini');

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
        }

        it('should initialize temp with specified temp dir', function() {
            test_({tempDir: '/some/dir'});

            assert.calledOnce(temp.init);
            assert.calledWith(temp.init, '/some/dir');
        });

        it('should initialize temp before start runner', function() {
            return test_()
                .then(function() {
                    assert.callOrder(
                        temp.init,
                        Runner.prototype.run
                    );
                });
        });
    });
});
