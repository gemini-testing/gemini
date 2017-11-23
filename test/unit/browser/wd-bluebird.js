'use strict';

const Promise = require('bluebird');
const q = require('q');
const proxyquire = require('proxyquire');

describe('wd-bluebird', () => {
    const sandbox = sinon.sandbox.create();
    let original, wrapped;

    beforeEach(() => {
        original = {
            promiseMethod: () => q('result'),
            emit() {},
            property: 'value'
        };

        const wd = proxyquire('lib/browser/wd-bluebird', {
            wd: {
                promiseRemote: () => original
            }
        });

        wrapped = wd.promiseRemote();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should cast original promise to Bluebird', () => {
        assert.instanceOf(
            wrapped.promiseMethod(),
            Promise
        );
    });

    it('should resolve to original value', () => {
        return assert.eventually.equal(
            wrapped.promiseMethod(),
            original.promiseMethod()
        );
    });

    it('should forward all arguments to original method', () => {
        const arg = 'arg';
        sandbox.spy(original, 'promiseMethod');

        wrapped.promiseMethod(arg);

        assert.calledWith(original.promiseMethod, arg);
    });

    it('should copy properties as is', () => {
        assert.equal(wrapped.property, original.property);
    });

    it('should not cast event emitter methods results', () => {
        assert.isUndefined(
            wrapped.emit('event')
        );
    });

    it('should not cast Object.prototype methods results', () => {
        assert.isString(
            wrapped.toString()
        );
    });
});
