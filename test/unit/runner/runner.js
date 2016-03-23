'use strict';
var Runner = require('../../../src/runner/runner');

describe('runner/base', function() {
    describe('passthroughEvent', function() {
        var runner,
            child;

        beforeEach(function() {
            runner = new Runner();
            child = new Runner();
        });

        it('should emit event emitted by child', function() {
            var onSomeEvent = sinon.spy();
            runner.on('some-event', onSomeEvent);
            runner.passthroughEvent(child, 'some-event');

            child.emit('some-event', 'some-data');

            assert.calledWith(onSomeEvent, 'some-data');
        });

        it('should emit all events emitted by child', function() {
            var onSomeEvent = sinon.spy(),
                onOtherEvent = sinon.spy();

            runner.on('some-event', onSomeEvent);
            runner.on('other-event', onOtherEvent);
            runner.passthroughEvent(child, ['some-event', 'other-event']);

            child.emit('some-event', 'some-data');
            child.emit('other-event', 'other-data');

            assert.calledWith(onSomeEvent, 'some-data');
            assert.calledWith(onOtherEvent, 'other-data');
        });

        it('should not break promise chain on event emitted by emitAndWait', function() {
            runner.passthroughEvent(child, 'some-event');
            runner.on('some-event', function() {
                return 'some-data';
            });

            return child.emitAndWait('some-event')
                .then(function(data) {
                    assert.equal(data, 'some-data');
                });
        });
    });
});
