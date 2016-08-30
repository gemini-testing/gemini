'use strict';

const TestSet = require('lib/test-reader/test-set');

describe('TestSet', () => {
    let set;

    beforeEach(() => {
        set = new TestSet({
            files: ['some/path/file.js'],
            browsers: ['bro1', 'bro2']
        });
    });

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
            set = new TestSet({files: []});
            set.filterFiles(['some/path/file.js']);

            const files = set.getFiles();

            assert.deepEqual(files, ['some/path/file.js']);
        });
    });
});
