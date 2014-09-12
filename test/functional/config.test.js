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
        it('should throw when reading non-existant file', function() {
            (function() {
                return new Config(configPath('notExists.yml'));
            }.must.throw(GeminiError));
        });

        it('should throw when reading non-YAML file', function() {
            (function() {
                return new Config(configPath('invalidConfig.yml'));
            }.must.throw(GeminiError));
        });

        it('should read valid config', function() {
            var config = new Config(configPath('validConfig.yml'));
            config.gridUrl.must.be('http://grid.example.com');
        });

        it('should set correct root', function() {
            var config = new Config(configPath('validConfig.yml'));
            config.projectRoot.must.be(DATA_ROOT);
        });

        it('should set realtive root relatively to config path', function() {
            var config = new Config(configPath('relPathConfig.yml'));
            config.projectRoot.must.be(path.join(DATA_ROOT, 'rel', 'path'));
        });

        it('should override options', function() {
            var config = new Config(configPath('validConfig.yml'), {
                gridUrl: 'http://example.com/overriden'
            });
            config.gridUrl.must.be('http://example.com/overriden');
        });
    });
});
