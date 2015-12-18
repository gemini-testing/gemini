'use strict';

var q = require('q'),
    NewScreenUpdater = require('../../../../lib/capture-processor/screen-updater/new-screen-updater'),
    fs = require('q-io/fs'),
    util = require('./util');

describe('new-screen-updater', function() {
    var sandbox = sinon.sandbox.create(),
        updater,
        capture;

    beforeEach(function() {
        sandbox.stub(fs);
        fs.makeTree.returns(q.resolve());
        capture = util.makeCaptureStub();
        updater = new NewScreenUpdater();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should make directory before saving the image', function() {
        var mediator = sinon.spy().named('mediator');
        fs.exists.returns(q.resolve(false));
        fs.makeTree.returns(q.delay(1).then(mediator));

        return updater.processCapture(capture)
            .then(function() {
                assert.callOrder(
                    fs.makeTree,
                    mediator,
                    capture.image.save
                );
            });
    });

    it('should save new image if it does not exists', function() {
        capture.browser.config.getScreenshotPath.returns('/some/path');
        fs.exists.returns(q.resolve(false));

        return updater.processCapture(capture)
            .then(function() {
                assert.calledWith(capture.image.save, '/some/path');
            });
    });

    it('should not save image if it already exists', function() {
        fs.exists.returns(q.resolve(true));

        return updater.processCapture(capture)
            .then(function() {
                assert.notCalled(capture.image.save);
            });
    });

    it('should save image with correct path', function() {
        capture.browser.config.getScreenshotPath.returns('/ref/path');
        fs.exists.returns(q.resolve(false));

        return updater.processCapture(capture)
            .then(function() {
                assert.calledWith(capture.image.save, '/ref/path');
            });
    });
});
