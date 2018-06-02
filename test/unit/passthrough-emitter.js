'use strict';
const PassthroughEmitter = require('lib/passthrough-emitter');

describe.only('PassthroughEmitter', () => {
    let runner,
        child;

    beforeEach(function() {
        runner = new PassthroughEmitter();
        child = new PassthroughEmitter();
    });

    it('should emit event emitted by child', () => {
        let onSomeEvent = sinon.spy();
        runner.on('some-event', onSomeEvent);
        runner.passthroughEvent(child, 'some-event');

        child.emit('some-event', 'some-data');

        assert.calledWith(onSomeEvent, 'some-data');
    });

    it('should emit all events emitted by child', () => {
        let onSomeEvent = sinon.spy(),
            onOtherEvent = sinon.spy();

        runner.on('some-event', onSomeEvent);
        runner.on('other-event', onOtherEvent);
        runner.passthroughEvent(child, ['some-event', 'other-event']);

        child.emit('some-event', 'some-data');
        child.emit('other-event', 'other-data');

        assert.calledWith(onSomeEvent, 'some-data');
        assert.calledWith(onOtherEvent, 'other-data');
    });

    it('should not break promise chain on event emitted by emitAndWait', () => {
        runner.passthroughEvent(child, 'some-event');
        runner.on('some-event', function() {
            return 'some-data';
        });

        return child.emitAndWait('some-event')
            .then((data) => {
                assert.equal(data, 'some-data');
            });
    });

    it('should be able to pass multiple event arguments', () => {
        runner.passthroughEvent(child, 'some-event');
        runner.on('some-event', function(...args) {
            return `some-data ${args[0]} ${args[1]}`;
        });

        return child.emitAndWait('some-event', 'foo', 'bar')
            .then((data) => {
                assert.equal(data, `some-data foo bar`);
            });
    });
});

