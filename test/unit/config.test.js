'use strict';
var Config = require('../../lib/config'),
    _ = require('lodash');

describe('config', function() {
    describe('overrides', function() {
        beforeEach(function() {
            /*jshint -W069*/
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
            /*jshint -W069*/
            delete process.env['gemini_system_project_root'];
            process.argv = this.oldArgv;
        });

        it('should not override anything by default', function() {
            assert.equal(this.getFinalConfigValue(), this.configValue);
        });

        it('should not override value with env if allowOverredies.env is false', function() {
            assert.equal(this.getFinalConfigValue({env: false}), this.configValue);
        });

        it('should override value with env if allowOverredies.env is true', function() {
            assert.equal(this.getFinalConfigValue({env: true}), this.envValue);
        });

        it('should not override value with cli if allowOverredies.cli is false', function() {
            assert.equal(this.getFinalConfigValue({cli: false}), this.configValue);
        });

        it('should override value with cli if allowOverredies.cli is true', function() {
            assert.equal(this.getFinalConfigValue({cli: true}), this.cliValue);
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

    describe('browser desiredCapabilities', function() {
        var TRAVIS_JOB_NUMBER = '123',
            ACTUAL_TRAVIS_JOB_NUMBER,
            TRAVIS_BUILD_NUMBER = '666',
            ACTUAL_TRAVIS_BUILD_NUMBER,
            sauceLabsUrl = 'http://username:access_key@ondemand.saucelabs.com/wd/hub',
            oldEnv;

        before(function() {
            ACTUAL_TRAVIS_JOB_NUMBER = process.env.TRAVIS_JOB_NUMBER;
            ACTUAL_TRAVIS_BUILD_NUMBER = process.env.TRAVIS_BUILD_NUMBER;
        });

        after(function() {
            process.env.TRAVIS_JOB_NUMBER = ACTUAL_TRAVIS_JOB_NUMBER;
            process.env.TRAVIS_BUILD_NUMBER = ACTUAL_TRAVIS_BUILD_NUMBER;
        });

        function mkConfig_(opts) {
            opts = _.defaults(opts || {}, {
                rootUrl: 'http://some/url',
                system: {
                    projectRoot: '/some/root'
                }
            });
            return new Config(opts);
        }

        it('should have \'tunnel-identifier\' and \'build\' when Travis and SauceLabs are used', function() {
            process.env.TRAVIS_JOB_NUMBER = TRAVIS_JOB_NUMBER;
            process.env.TRAVIS_BUILD_NUMBER = TRAVIS_BUILD_NUMBER;
            var config = mkConfig_({
                    browsers: {
                        browser: {
                            desiredCapabilities: {},
                            gridUrl: sauceLabsUrl
                        }
                    }
                }),
                browserConfig = config.forBrowser('browser');
            assert.equal(browserConfig.desiredCapabilities['tunnel-identifier'], TRAVIS_JOB_NUMBER);
            assert.equal(browserConfig.desiredCapabilities.build, TRAVIS_BUILD_NUMBER);
        });

        it('shouldn\'t have \'tunnel-identifier\' and \'build\' when SauceLabs is not used', function() {
            process.env.TRAVIS_JOB_NUMBER = TRAVIS_JOB_NUMBER;
            process.env.TRAVIS_BUILD_NUMBER = TRAVIS_BUILD_NUMBER;
            var config = mkConfig_({
                    browsers: {
                        browser: {
                            desiredCapabilities: {},
                            gridUrl: 'http://somehost/wd/hub'
                        }
                    }
                }),
                browserConfig = config.forBrowser('browser');
            assert.isUndefined(browserConfig.desiredCapabilities['tunnel-identifier']);
            assert.isUndefined(browserConfig.desiredCapabilities.build);
        });

        it('shouldn\'t have \'tunnel-identifier\' and \'build\' when Travis is not used', function() {
            delete process.env.TRAVIS_JOB_NUMBER;
            delete process.env.TRAVIS_BUILD_NUMBER;
            var config = mkConfig_({
                    browsers: {
                        browser: {
                            desiredCapabilities: {},
                            gridUrl: sauceLabsUrl
                        }
                    }
                }),
                browserConfig = config.forBrowser('browser');
            assert.isUndefined(browserConfig.desiredCapabilities['tunnel-identifier']);
            assert.isUndefined(browserConfig.desiredCapabilities.build);
        });
    });
});
