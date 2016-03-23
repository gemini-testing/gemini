'use strict';
var parser = require('../../../src/config/options'),
    GeminiError = require('../../../src/errors/gemini-error'),
    _ = require('lodash');

describe('config.sets', function() {
    ///
    function createConfig(opts) {
        var REQUIRED_OPTIONS = {
            system: {
                projectRoot: '/some/path'
            },
            rootUrl: 'http://example.com/root',
            desiredCapabilities: {}
        };

        var options = _.extend({}, REQUIRED_OPTIONS, opts);

        return parser({
            options: options,
            env: {},
            argv: []
        });
    }

    describe('files', function() {
        it('should be `gemini` by default', function() {
            var config = createConfig({
                    sets: {
                        someSet: {}
                    }
                });

            assert.deepEqual(config.sets.someSet.files, ['gemini']);
        });

        it('should convert string to array of strings', function() {
            var config = createConfig({
                    sets: {
                        someSet: {
                            files: 'some/path'
                        }
                    }
                });

            assert.deepEqual(config.sets.someSet.files, ['some/path']);
        });

        it('should not accept non-string arrays', function() {
            assert.throws(function() {
                createConfig({
                    sets: {
                        someSet: {
                            files: [100500]
                        }
                    }
                });
            }, GeminiError);
        });

        it('should accept array with strings', function() {
            var config = createConfig({
                sets: {
                    someSet: {
                        files: [
                            'some/path',
                            'other/path'
                        ]
                    }
                }
            });

            assert.deepEqual(config.sets.someSet.files, [
                'some/path',
                'other/path'
            ]);
        });
    });

    describe('browsers', function() {
        it('should contain all browsers by default', function() {
            var config = createConfig({
                browsers: {
                    b1: {},
                    b2: {}
                },
                sets: {
                    someSet: {}
                }
            });

            assert.deepEqual(config.sets.someSet.browsers, ['b1', 'b2']);
        });

        it('should not accept non-arrays', function() {
            assert.throws(function() {
                createConfig({
                    sets: {
                        someSet: {
                            browsers: 'something'
                        }
                    }
                });
            }, GeminiError);
        });

        it('should not accept unknown browsers', function() {
            assert.throws(function() {
                createConfig({
                    browsers: {
                        b1: {},
                        b2: {}
                    },
                    sets: {
                        someSet: {
                            browsers: ['b3']
                        }
                    }
                });
            }, GeminiError);
        });

        it('should accept configured browsers', function() {
            var config = createConfig({
                browsers: {
                    b1: {},
                    b2: {}
                },
                sets: {
                    set1: {
                        browsers: ['b1']
                    },
                    set2: {
                        browsers: ['b2']
                    }
                }
            });

            assert.deepEqual(config.sets.set1.browsers, ['b1']);
            assert.deepEqual(config.sets.set2.browsers, ['b2']);
        });
    });

    it('should have `all` set with default values if no set specified', function() {
        var config = createConfig({
            browsers: {
                b1: {},
                b2: {}
            }
        });

        assert.deepEqual(config.sets.all.files, ['gemini']);
        assert.deepEqual(config.sets.all.browsers, ['b1', 'b2']);
    });
});
