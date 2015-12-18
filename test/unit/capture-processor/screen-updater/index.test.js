'use strict';

var screenUpdater = require('../../../../lib/capture-processor/screen-updater'),
    DiffUpdater = require('../../../../lib/capture-processor/screen-updater/diff-screen-updater'),
    NewUpdater = require('../../../../lib/capture-processor/screen-updater/new-screen-updater'),
    MetaUpdater = require('../../../../lib/capture-processor/screen-updater/meta-screen-updater');

describe('capture-processor/screen-updater/create', function() {
    it('should create MetaUpdater by default', function() {
        var updater = screenUpdater.create(null, {});

        assert.instanceOf(updater, MetaUpdater);
    });

    it('should create DiffUpdater if "diff" option is exists', function() {
        var updater = screenUpdater.create(null, {diff: true});

        assert.instanceOf(updater, DiffUpdater);
    });

    it('should create NewUpdater if "new" option is exists', function() {
        var updater = screenUpdater.create(null, {new: true});

        assert.instanceOf(updater, NewUpdater);
    });

    it('should create MetaUpdater if "new" and "diff" options were applied', function() {
        var updater = screenUpdater.create(null, {diff: true, new: true});

        assert.instanceOf(updater, MetaUpdater);
    });

    it('should create MetaUpdater if unknown option was applied', function() {
        var updater = screenUpdater.create(null, {unknownOption: true});

        assert.instanceOf(updater, MetaUpdater);
    });
});
