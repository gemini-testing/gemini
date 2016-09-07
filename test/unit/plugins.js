'use strict';

const proxyquire = require('proxyquire');

describe('plugins', () => {
    let plugins;
    let foobarPlugin;
    let gemini;

    beforeEach(() => {
        foobarPlugin = sinon.spy();
        gemini = sinon.spy();

        plugins = proxyquire
            .noCallThru()
            .load('lib/plugins', {
                'gemini-foobar': foobarPlugin
            });
    });

    describe('load', () => {
        it('should load plugin with "gemini-" prefix', () => {
            gemini.config = {system: {plugins: {'gemini-foobar': true}}};

            plugins.load(gemini);

            assert.calledWith(foobarPlugin, gemini);
        });

        it('should load plugin without "gemini-" prefix', () => {
            gemini.config = {system: {plugins: {foobar: true}}};

            plugins.load(gemini);

            assert.calledWith(foobarPlugin, gemini);
        });

        it('should not load disabled plugins', () => {
            gemini.config = {system: {plugins: {foobar: false}}};

            plugins.load(gemini);

            assert.notCalled(foobarPlugin);
        });

        it('should not throw error if plugins are not specified', () => {
            gemini.config = {system: {plugins: {}}};

            assert.doesNotThrow(() => plugins.load(gemini));
        });

        it('should throw error if plugin was not found', () => {
            gemini.config = {system: {plugins: {'nonexistent-plugin': true}}};

            assert.throws(() => plugins.load(gemini));
        });

        it('should pass to plugin empty configuration if it was enabled with `true` value', () => {
            gemini.config = {system: {plugins: {foobar: true}}};

            plugins.load(gemini);

            assert.calledWith(foobarPlugin, gemini, {});
        });

        it('should pass to plugin empty configuration if it was enabled with empty object', () => {
            gemini.config = {system: {plugins: {foobar: {}}}};

            plugins.load(gemini);

            assert.calledWith(foobarPlugin, gemini, {});
        });

        it('should pass to plugin its configuration', () => {
            gemini.config = {system: {plugins: {foobar: {foo: 'bar'}}}};

            plugins.load(gemini);

            assert.calledWith(foobarPlugin, gemini, {foo: 'bar'});
        });
    });
});
