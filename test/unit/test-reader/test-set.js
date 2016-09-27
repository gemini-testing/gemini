'use strict';

const proxyquire = require('proxyquire');
const TestSet = require('lib/test-reader/test-set');

describe('TestSet', () => {
    const sandbox = sinon.sandbox.create();

    let set;

    beforeEach(() => {
        set = TestSet.create({
            files: ['some/path/file.js'],
            browsers: ['bro1', 'bro2']
        });
    });

    afterEach(() => sandbox.restore());

    it('should return all set files', () => {
        const files = set.getFiles();

        assert.deepEqual(files, ['some/path/file.js']);
    });

    it('should return browsers if set files contain passed path', () => {
        const browsers = set.getBrowsers('some/path/file.js');

        assert.deepEqual(browsers, ['bro1', 'bro2']);
    });

    it('should not return browsers if set files do not contain passed path', () => {
        const browsers = set.getBrowsers('other/path/file1.js');

        assert.deepEqual(browsers, []);
    });

    describe('filterFiles', () => {
        it('should return set files and passed files intersection', () =>{
            set.filterFiles(['some/path/file.js', 'some/path/file2.js']);

            const files = set.getFiles();

            assert.deepEqual(files, ['some/path/file.js']);
        });

        it('should return set files if files are not passed', () =>{
            set.filterFiles([]);

            const files = set.getFiles();

            assert.deepEqual(files, ['some/path/file.js']);
        });

        it('should return passed files if set files are empty', () => {
            set = TestSet.create({files: []});
            set.filterFiles(['some/path/file.js']);

            const files = set.getFiles();

            assert.deepEqual(files, ['some/path/file.js']);
        });

        describe('all files in set are specified as masks', () => {
            it('should call micromatch to match passed files with set of files masks', () => {
                const mmStub = sandbox.stub();
                const TestSet = proxyquire('lib/test-reader/test-set', {
                    micromatch: mmStub
                });

                const passedFiles = ['some/path/file.js', 'some/path/file2.js'];

                set = TestSet.create({files: ['some/*/*.js']}, {allFilesMasks: true});

                set.filterFiles(passedFiles);

                assert.calledWith(mmStub, passedFiles, ['some/*/*.js']);
            });

            it('should return matched passed files with set of files masks', () => {
                set = TestSet.create({files: ['some/*/*.js']}, {allFilesMasks: true});

                set.filterFiles(['some/path/file.js', 'another/path/file2.js']);

                assert.deepEqual(set.getFiles(), ['some/path/file.js']);
            });
        });
    });
});
