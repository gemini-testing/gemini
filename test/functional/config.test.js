'use strict';
var path = require('path'),
    Config = require('../../lib/config'),
    GeminiError = require('../../lib/errors/gemini-error'),

    DATA_ROOT = path.join(__dirname, 'data', 'config');

function configPath(name) {
    return path.join(DATA_ROOT, name);
}

describe('config', function() {
    describe('constructor with file path', function() {
        describe('.yml', function() {
            it('should throw when reading non-existent file', function() {
                assert.throws(function() {
                    return new Config(configPath('notExists.yml'));
                }, GeminiError);
            });

            it('should throw when reading non-YAML file', function() {
                assert.throws(function() {
                    return new Config(configPath('invalidConfig.yml'));
                }, GeminiError);
            });

            it('should read valid config', function() {
                var config = new Config(configPath('validConfig.yml'));
                assert.deepPropertyVal(config, 'system.projectRoot', '/it/works');
            });

            it('should set correct root', function() {
                var config = new Config(configPath('noRootConfig.yml'));
                assert.deepPropertyVal(config, 'system.projectRoot', DATA_ROOT);
            });

            it('should set relative root relatively to config path', function() {
                var config = new Config(configPath('relPathConfig.yml'));
                assert.deepPropertyVal(config, 'system.projectRoot', path.join(DATA_ROOT, 'rel', 'path'));
            });
        });

        describe('.js', function() {
            it('should read valid config', function() {
                var config = new Config(configPath('validConfig.js'));
                assert.deepPropertyVal(config, 'system.projectRoot', '/it/works');
            });

            it('should throw on non-existent file', function() {
                assert.throws(function() {
                    return new Config(configPath('notExists.js'));
                }, GeminiError);
            });
        });

        describe('.json', function() {
            it('should read valid config', function() {
                var config = new Config(configPath('validConfig.json'));
                assert.deepPropertyVal(config, 'system.projectRoot', '/it/works');
            });

            it('should throw on non-existent file', function() {
                assert.throws(function() {
                    return new Config(configPath('notExists.json'));
                }, GeminiError);
            });
        });
    });
});
