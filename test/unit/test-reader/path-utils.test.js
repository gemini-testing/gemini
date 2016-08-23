'use strict';

const proxyquire = require('proxyquire');
const qfs = require('q-io/fs');
const q = require('q');

describe('path-utils', () => {
    const sandbox = sinon.sandbox.create();

    let glob;
    let pathUtils;

    beforeEach(() => {
        sandbox.stub(qfs, 'listTree');
        sandbox.stub(qfs, 'absolute');
        sandbox.stub(qfs, 'stat').returns(q({isDirectory: () => false}));

        glob = sandbox.stub();

        pathUtils = proxyquire('lib/test-reader/path-utils', {glob});
    });

    afterEach(() => sandbox.restore());

    it('should get absolute file path from passed mask', () => {
        glob.withArgs('some/deep/**/*.js').yields(null, ['some/deep/path/file.js']);

        qfs.absolute.withArgs('some/deep/path/file.js').returns('/absolute/some/deep/path/file.js');

        return pathUtils.expandPaths(['some/deep/**/*.js'])
            .then((absolutePaths) => {
                assert.deepEqual(absolutePaths, ['/absolute/some/deep/path/file.js']);
            });
    });

    it('should get absolute js file path from passed directory path', () => {
        glob.withArgs('some/path/').yields(null, ['some/path/']);

        qfs.stat.returns(q({isDirectory: () => true}));

        qfs.listTree.withArgs('some/path/').returns(q(['some/path/first.js', 'some/path/second.txt']));

        qfs.absolute.withArgs('some/path/first.js').returns('/absolute/some/path/first.js');

        return pathUtils.expandPaths(['some/path/'])
            .then((absolutePaths) => {
                assert.deepEqual(absolutePaths, ['/absolute/some/path/first.js']);
            });
    });

    it('should return uniq absolute file path', () => {
        glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

        qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

        return pathUtils.expandPaths(['some/path/file.js', 'some/path/file.js'])
            .then((absolutePaths) => {
                assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
            });
    });

    it('should get absolute file path from passed file path', () => {
        glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

        qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

        return pathUtils.expandPaths(['some/path/file.js'])
            .then((absolutePaths) => {
                assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
            });
    });

    it('should return empty array when called without arguments', () => {
        return pathUtils.expandPaths()
            .then((absolutePaths) => {
                assert.deepEqual(absolutePaths, []);
            });
    });
});
