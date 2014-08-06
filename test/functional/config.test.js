'use strict';
var path = require('path'),
    assert = require('assert'),
    Config = require('../../lib/config'),
    GeminiError = require('../../lib/errors/gemini-error'),

    DATA_ROOT = path.join(__dirname, 'data', 'config');

function configPath(name) {
    return path.join(DATA_ROOT, name);
}

describe('config', function() {
    describe('readYAMLFile', function() {
        it('should throw when reading non-existant file', function() {
            return Config.readYAMLFile(configPath('notExists.yml'))
                .then(function() {
                    assert.fail('Must not resolve succefully');
                }, function(e) {
                    e.must.be.instanceOf(GeminiError);
                });
        });

        it('should throw when reading non-YAML file', function() {
            return Config.readYAMLFile(configPath('invalidConfig.yml'))
                .then(function() {
                    assert.fail('Must not resolve succefully');
                }, function(e) {
                    e.must.be.instanceOf(GeminiError);
                });
        });

        it('should read valid config', function() {
            return Config.readYAMLFile(configPath('validConfig.yml'))
                .then(function(config) {
                    config.gridUrl.must.be('http://grid.example.com');
                });
        });

        it('should set correct root', function() {
            return Config.readYAMLFile(configPath('validConfig.yml'))
                .then(function(config) {
                    config.root.must.be(DATA_ROOT);
                });
        });

        it('should override options', function() {
            return Config
                .readYAMLFile(configPath('validConfig.yml'), {
                    gridUrl: 'http://example.com/overriden'
                })
                .then(function(config) {
                    config.gridUrl.must.be('http://example.com/overriden');
                });
        });
    });
});
