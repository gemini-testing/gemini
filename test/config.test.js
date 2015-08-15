'use strict';
var Config = require('../lib/config'),
    assert = require('chai').assert;

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
});
