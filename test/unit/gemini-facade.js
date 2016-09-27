'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');
const GeminiFacade = require('lib/gemini-facade');
const Events = require('lib/constants/events');

describe('gemini-facade', () => {
    const sandbox = sinon.sandbox.create();

    const mkConfig = (opts) => {
        return _.defaults(opts || {}, {
            rootUrl: 'http://localhost'
        });
    };

    afterEach(() => sandbox.restore());

    it('should provide access to passed config', () => {
        const runner = new EventEmitter();
        runner.config = mkConfig();

        const facade = new GeminiFacade(runner);

        assert.deepEqual(facade.config, runner.config);
    });

    it('should provide access to events', () => {
        const facade = new GeminiFacade(new EventEmitter());

        assert.deepEqual(facade.events, Events);
    });

    it('should passthrough all runner events', () => {
        const runner = new EventEmitter();
        const facade = new GeminiFacade(runner);

        _.forEach(Events, (event, name) => {
            const spy = sinon.spy().named(name + ' handler');
            facade.on(event, spy);

            runner.emit(event, 'testValue');

            assert.calledOnce(spy);
            assert.calledWith(spy, 'testValue');
        });
    });
});
