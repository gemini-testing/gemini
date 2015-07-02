'use strict';
var path = require('path'),
    assert = require('chai').assert,
    Config = require('../../lib/config'),
    GeminiError = require('../../lib/errors/gemini-error'),

    DATA_ROOT = path.join(__dirname, 'data', 'config');

function configPath(name) {
    return path.join(DATA_ROOT, name);
}

describe('config', function() {
    describe('constructor with file path', function() {
        it('should throw when reading non-existant file', function() {
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

        it('should set realtive root relatively to config path', function() {
            var config = new Config(configPath('relPathConfig.yml'));
            assert.deepPropertyVal(config, 'system.projectRoot', path.join(DATA_ROOT, 'rel', 'path'));
        });
    });
});
