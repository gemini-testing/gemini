'use strict';
var plugins = require('../lib/plugins'),
    mockery = require('mockery'),
    sinon = require('sinon');

describe('plugins', function() {
    beforeEach(function() {
        this.foobarPlugin = sinon.spy();
        this.gemini = sinon.spy();

        mockery.registerMock('gemini-foobar', this.foobarPlugin);
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        });
    });

    afterEach(function() {
        mockery.disable();
    });

    describe('load', function() {
        it('should load plugin without prefix', function() {
            var options = {plugins: {foobar: true}};
            plugins.load(this.gemini, options);

            sinon.assert.calledWith(this.foobarPlugin, this.gemini, {});
        });

        it('should load plugin with prefix', function() {
            var options = {plugins: {'gemini-foobar': true}};
            plugins.load(this.gemini, options);

            sinon.assert.calledWith(this.foobarPlugin, this.gemini, {});
        });

        it('should throw error if plugin not found', function() {
            var options = {plugins: {'gemini-foo': true}};

            (function() {
                plugins.load(this.gemini, options);
            }).must.throw();
        });

        it('should not load disabled plugins', function() {
            var options = {plugins: {foobar: false}};
            plugins.load(this.gemini, options);

            sinon.assert.notCalled(this.foobarPlugin);
        });

        it('should load plugin with empty configuration', function() {
            var options = {plugins: {foobar: {}}};
            plugins.load(this.gemini, options);

            sinon.assert.calledWith(this.foobarPlugin, this.gemini, {});
        });

        it('should handle empty plugins', function() {
            var options = {plugins: {}};
            plugins.load(this.gemini, options);
        });

        it('should pass plugin its configuration', function() {
            var options = {plugins: {foobar: {foo: 'bar'}}};
            plugins.load(this.gemini, options);

            sinon.assert.calledWith(this.foobarPlugin, this.gemini, {foo: 'bar'});
        });
    });
});
