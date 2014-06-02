'use strict';
var Browser = require('../lib/browser'),
    q = require('q'),
    wd = require('wd'),
    StateError = require('../lib/errors/state-error'),
    sinon = require('sinon');

describe('browser', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('open', function() {
        beforeEach(function() {
            this.wd = {
                configureHttp: sinon.stub().returns(q()),
                init: sinon.stub().returns(q({})),
                get: sinon.stub().returns(q()),
                execute: sinon.stub().returns(q({}))
            };

            this.config = {
                capabilities: {},
                http: {
                    timeout: 100,
                    retries: 5,
                    retryDelay: 25
                }
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);
            this.browser = new Browser(this.config, 'browser', {
                browserName: 'browser',
                version: '1.0'
            });
        });

        it('should init browser with browserName, version and takeScreenshot capabilites', function() {
            var _this = this;
            return this.browser.open('http://example.com').then(function() {
                sinon.assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true
                });
            });
        });

        it('should set http options for browser instance', function() {
            var _this = this;
            return this.browser.open('http://example.com').then(function() {
                sinon.assert.calledWith(_this.wd.configureHttp, {
                    timeout: 100,
                    retries: 5,
                    retryDelay: 25
                });
            });
        });

        it('should mix additional capabilites from config', function() {
            var _this = this;
            this.config.capabilities = {
                option1: 'value1',
                option2: 'value2'
            };

            return this.browser.open('http://example.com').then(function() {
                sinon.assert.calledWith(_this.wd.init, {
                    browserName: 'browser',
                    version: '1.0',
                    takesScreenshot: true,
                    option1: 'value1',
                    option2: 'value2'
                });
            });
        });

        it('should inject client script');
    });

    describe('captureState', function() {
        beforeEach(function() {
            this.wd = {
                takeScreenshot: sinon.stub().returns(q('')),
                eval: sinon.stub().returns(q({})),
                execute: sinon.stub().returns(q({}))
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = new Browser({}, 'browser', {browserName: 'browser', version: '1.0'});

            this.state = {
                captureSelectors: ['.some-class'],
                activate: sinon.stub().returns(q())
            };

        });

        it('should activate the state', function() {
            var _this = this;
            return this.browser.captureState(this.state).then(function() {
                sinon.assert.calledWith(_this.state.activate, _this.browser);
            });
        });

        it('should take the screenshot', function() {
            var _this = this;

            return this.browser.captureState(this.state).then(function() {
                sinon.assert.called(_this.wd.takeScreenshot);
            });
        });

        it('should search rect for all found elements', function() {
            var _this = this;
            this.state.captureSelectors = ['.selector1', '.selector2'];

            return this.browser.captureState(this.state).then(function() {
                /*jshint evil:true*/
                sinon.assert.calledWith(_this.wd.eval, 
                    '__gemini.getScreenshotRect([".selector1",".selector2"]);');
            });
        });

        it('should reject with StateError if element not found', function(done) {
            /*jshint evil:true*/
            this.state.captureSelectors = ['.selector'];
            this.state.suite = {name: 'suite'};
            this.wd.eval
                .withArgs('__gemini.getScreenshotRect([".selector"]);')
                .returns(q({
                    error: 'NOTFOUND',
                    message: 'Ooops!'
                }));

            return this.browser.captureState(this.state).fail(function(error) {
                error.must.be.instanceOf(StateError);
                error.message.must.eql('Ooops!');
                done();
            });
        });

        it('should crop screenshot to returened rect');
    });
});
