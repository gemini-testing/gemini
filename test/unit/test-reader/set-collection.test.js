'use strict';

const _ = require('lodash');
const q = require('bluebird-q');
const globExtra = require('glob-extra');
const SetCollection = require('lib/test-reader/set-collection');
const TestSet = require('lib/test-reader/test-set');

describe('set-collection', () => {
    const sandbox = sinon.sandbox.create();

    const mkSetStub = () => {
        const set = sandbox.stub();

        set.filterFiles = sandbox.stub();

        return set;
    };

    const mkConfigStub = (opts) => {
        return _.defaults(opts || {}, {
            sets: opts.sets || {},
            getBrowserIds: opts.getBrowserIds,
            system: {
                projectRoot: '/root'
            }
        });
    };

    beforeEach(() => {
        sandbox.stub(globExtra, 'expandPaths').returns(q([]));
    });

    afterEach(() => sandbox.restore());

    describe('sets are not specified in config', () => {
        it('should throw an error if an unknown set was passed', () => {
            assert.throws(() => SetCollection.create(mkConfigStub(), ['unknown-set'], /unknown-set/));
        });

        it('should create new set with empty files and browsers from config', () => {
            sandbox.stub(TestSet, 'create').returns(mkSetStub());

            const getBrowserIds = sandbox.stub().returns(['b1', 'b2']);

            return SetCollection.create(mkConfigStub({getBrowserIds}))
                .then(() => {
                    assert.calledWith(globExtra.expandPaths, []);
                    assert.calledWith(TestSet.create, {files: [], browsers: ['b1', 'b2']});
                });
        });
    });

    it('should create collection for specified sets', () => {
        const config = mkConfigStub({
            sets: {
                set1: {files: ['some/files']},
                set2: {files: ['other/files']}
            }
        });

        sandbox.stub(TestSet, 'create').returns(mkSetStub());

        globExtra.expandPaths.withArgs(['some/files']).returns(q(['some/files/file.js']));

        return SetCollection.create(config, ['set1'])
            .then(() => {
                assert.calledOnce(TestSet.create);
                assert.calledWith(TestSet.create, {files: ['some/files/file.js']});
            });
    });

    it('should expand paths using project root', () => {
        return SetCollection.create(mkConfigStub({
            sets: {
                set: mkSetStub()
            },
            system: {
                projectRoot: '/root'
            }
        }))
        .then(() => {
            assert.calledWithMatch(globExtra.expandPaths, sinon.match.any, {root: '/root'});
        });
    });

    it('should create collection for config sets by default', () => {
        const config = mkConfigStub({
            sets: {
                set1: {files: ['some/files']},
                set2: {files: ['other/files']}
            }
        });

        globExtra.expandPaths
            .withArgs(['some/files']).returns(q(['some/files/file1.js']))
            .withArgs(['other/files']).returns(q(['other/files/file2.js']));

        sandbox.stub(TestSet, 'create').returns(mkSetStub());

        return SetCollection.create(config)
            .then(() => {
                assert.calledWith(TestSet.create, {files: ['some/files/file1.js']});
                assert.calledWith(TestSet.create, {files: ['other/files/file2.js']});
            });
    });

    it('should throw an error if an unknown set was passed', () => {
        const config = mkConfigStub({
            sets: {
                set1: {files: ['some/files']},
                set2: {files: ['other/files']}
            }
        });

        assert.throws(() => SetCollection.create(config, ['unknown-set']), /unknown-set(.+) set1, set2/);
    });

    it('should filter passed files if sets are specified in config', () => {
        const sets = {
            set1: mkSetStub(),
            set2: mkSetStub()
        };

        sandbox.stub(TestSet, 'create')
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
            sets: {
                set1: {
                    files: ['some/files'],
                    browsers: ['bro1']
                },
                set2: {
                    files: ['other/files'],
                    browsers: ['bro2']
                }
            }
        });

        globExtra.expandPaths
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
