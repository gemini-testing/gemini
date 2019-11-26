'use strict';
var Config = require('lib/config'),
    configReader = require('lib/config/config-reader'),
    path = require('path'),
    _ = require('lodash');

describe('config', function() {
    var sandbox = sinon.sandbox.create();

    afterEach(function() {
        sandbox.restore();
    });

    it('should read config file', function() {
        sandbox.stub(configReader, 'read').returns({rootUrl: ''});

        new Config('/some/path'); // eslint-disable-line

        assert.calledWith(configReader.read, '/some/path');
    });

    it('should have static API for reading of a configuration file', () => {
        sandbox.stub(configReader, 'read')
            .withArgs('/some/path')
            .returns({foo: 'bar'});

        assert.deepEqual(Config.readRawConfig('/some/path'), {
            foo: 'bar',
            system: {
                projectRoot: '/some'
            }
        });
    });

    describe('overrides', function() {
        beforeEach(function() {
            this.configValue = '/from/config';
            this.envValue = '/from/env';
            this.cliValue = '/from/cli';

            process.env['gemini_system_project_root'] = this.envValue;

            this.oldArgv = process.argv;
            process.argv = this.oldArgv.concat('--system-project-root', this.cliValue);

            this.getFinalConfigValue = function(allowOverrides) {
                return new Config({
                    // rootUrl is required to pass validation
                    rootUrl: 'http://irrelevant',
                    system: {
                        projectRoot: this.configValue
                    }
                }, allowOverrides).system.projectRoot;
            };
        });

        afterEach(function() {
            delete process.env['gemini_system_project_root'];
            process.argv = this.oldArgv;
        });

        it('should not override anything by default', function() {
            assert.equal(this.getFinalConfigValue(), path.resolve(this.configValue));
        });

        it('should not override value with env if allowOverredies.env is false', function() {
            assert.equal(this.getFinalConfigValue({env: false}), path.resolve(this.configValue));
        });

        it('should override value with env if allowOverredies.env is true', function() {
            assert.equal(this.getFinalConfigValue({env: true}), path.resolve(this.envValue));
        });

        it('should not override value with cli if allowOverredies.cli is false', function() {
            assert.equal(this.getFinalConfigValue({cli: false}), path.resolve(this.configValue));
        });

        it('should override value with cli if allowOverredies.cli is true', function() {
            assert.equal(this.getFinalConfigValue({cli: true}), path.resolve(this.cliValue));
        });
    });

    describe('forBrowser', function() {
        // Set required options
        function mkConfig_(opts) {
            opts = _.defaults(opts || {}, {
                system: {
                    projectRoot: '/some/root'
                },
                browsers: {}
            });

            _.forEach(opts.browsers, function(browser) {
                _.defaults(browser, {
                    desiredCapabilities: {}
                });
            });

            return new Config(opts);
        }

        it('should return same object for each request', function() {
            var config = mkConfig_({
                rootUrl: 'http://some/url',
                browsers: {
                    browser: {}
                }
            });

            var browserConfig = config.forBrowser('browser');
            browserConfig.rootUrl = 'http://new/url';

            var browserConfig2 = config.forBrowser('browser');
            assert.equal(browserConfig2.rootUrl, 'http://new/url');
        });

        it('should return different objects for different browsers', function() {
            var config = mkConfig_({
                rootUrl: 'http://some/url',
                browsers: {
                    browser1: {},
                    browser2: {}
                }
            });

            var browserConfig1 = config.forBrowser('browser1');
            browserConfig1.rootUrl = 'http://new/url';

            var browserConfig2 = config.forBrowser('browser2');
            assert.equal(browserConfig2.rootUrl, 'http://some/url');
        });
    });
});
