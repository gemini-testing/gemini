'use strict';

const _ = require('lodash');
const q = require('q');
const pathUtils = require('lib/test-reader/path-utils');
const SetCollection = require('lib/test-reader/set-collection');
const Set = require('lib/test-reader/set');

describe('set-collection', () => {
    const sandbox = sinon.sandbox.create();

    const mkConfigStub = (sets) => {
        sets = _.defaults(sets || {}, {
            setStub: {}
        });

        return {
            sets,
            system: {
                projectRoot: '/root'
            }
        };
    };

    const mkSetStub = () => {
        const set = sandbox.stub();

        set.filterFiles = sandbox.stub();

        return set;
    };

    beforeEach(() => {
        sandbox.stub(pathUtils, 'expandPaths').returns(q([]));
    });

    afterEach(() => sandbox.restore());

    it('should create collection for specified sets', () => {
        const config = mkConfigStub({
            set1: {files: ['some/files']},
            set2: {files: ['other/files']}
        });

        sandbox.stub(Set, 'create').returns(mkSetStub());

        pathUtils.expandPaths.withArgs(['some/files']).returns(q(['some/files/file.js']));

        return SetCollection.create(config, ['set1'])
            .then(() => {
                assert.calledOnce(Set.create);
                assert.calledWith(Set.create, {files: ['some/files/file.js']});
            });
    });

    it('should create collection for config sets by default', () => {
        const config = mkConfigStub({
            set1: {files: ['some/files']},
            set2: {files: ['other/files']}
        });

        pathUtils.expandPaths
            .withArgs(['some/files']).returns(q(['some/files/file1.js']))
            .withArgs(['other/files']).returns(q(['other/files/file2.js']));

        sandbox.stub(Set, 'create').returns(mkSetStub());

        return SetCollection.create(config)
            .then(() => {
                assert.calledWith(Set.create, {files: ['some/files/file1.js']});
                assert.calledWith(Set.create, {files: ['other/files/file2.js']});
            });
    });

    it('should throw an error if an unknown set was passed', () => {
        const config = mkConfigStub({
            set1: {files: ['some/files']},
            set2: {files: ['other/files']}
        });

        assert.throws(() => SetCollection.create(config, ['set3']), /set3(.+) set1, set2/);
    });

    it('should filter sets files by passed files', () => {
        const sets = {
            set1: mkSetStub(),
            set2: mkSetStub()
        };

        sandbox.stub(Set, 'create')
            .onFirstCall().returns(sets.set1)
            .onSecondCall().returns(sets.set2);

        return SetCollection.create(mkConfigStub({sets}))
            .then((setCollection) => {
                setCollection.filterFiles(['some/files/file.js']);
                assert.calledWith(sets.set1.filterFiles, ['some/files/file.js']);
                assert.calledWith(sets.set2.filterFiles, ['some/files/file.js']);
            });
    });

    it('should apply function to each sets files', () => {
        const config = mkConfigStub({
            set1: {
                files: ['some/files'],
                browsers: ['bro1']
            },
            set2: {
                files: ['other/files'],
                browsers: ['bro2']
            }
        });

        pathUtils.expandPaths
            .withArgs(['some/files']).returns(q(['some/files/file1.js']))
            .withArgs(['other/files']).returns(q(['other/files/file2.js']));

        return SetCollection.create(config)
            .then((setCollection) => {
                const callback = sandbox.stub();

                setCollection.forEachFile(callback);

                assert.calledWith(callback, 'some/files/file1.js', ['bro1']);
                assert.calledWith(callback, 'other/files/file2.js', ['bro2']);
            });
    });
});
