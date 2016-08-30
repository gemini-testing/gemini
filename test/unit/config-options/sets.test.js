'use strict';

const MissingOptionError = require('gemini-configparser').MissingOptionError;
const _ = require('lodash');

const parser = require('lib/config/options');
const GeminiError = require('lib/errors/gemini-error');

describe('config.sets', () => {
    const createConfig = (opts) => {
        const REQUIRED_OPTIONS = {
            system: {
                projectRoot: '/some/path'
            },
            rootUrl: 'http://example.com/root',
            desiredCapabilities: {}
        };

        const options = _.extend({}, REQUIRED_OPTIONS, opts);

        return parser({
            options: options,
            env: {},
            argv: []
        });
    };

    describe('files', () => {
        it('should throw an error if files are not specified', () => {
            assert.throws(() => {
                createConfig({
                    sets: {
                        someSet: {}
                    }
                });
            }, MissingOptionError);
        });

        it('should convert string to array of strings', () => {
            const config = createConfig({
                sets: {
                    someSet: {
                        files: 'some/path'
                    }
                }
            });

            assert.deepEqual(config.sets.someSet.files, ['some/path']);
        });

        it('should not accept non-string arrays', () => {
            assert.throws(() => {
                createConfig({
                    sets: {
                        someSet: {
                            files: [100500]
                        }
                    }
                });
            }, GeminiError);
        });

        it('should accept array with strings', () => {
            const config = createConfig({
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

    describe('browsers', () => {
        it('should contain all browsers by default', () => {
            var config = createConfig({
                browsers: {
                    b1: {},
                    b2: {}
                },
                sets: {
                    someSet: {
                        files: ['some/path']
                    }
                }
            });

            assert.deepEqual(config.sets.someSet.browsers, ['b1', 'b2']);
        });

        it('should not accept non-arrays', () => {
            assert.throws(() => {
                createConfig({
                    sets: {
                        someSet: {
                            files: ['some/path'],
                            browsers: 'something'
                        }
                    }
                });
            }, GeminiError);
        });

        it('should not accept unknown browsers', () => {
            assert.throws(() => {
                createConfig({
                    browsers: {
                        b1: {},
                        b2: {}
                    },
                    sets: {
                        someSet: {
                            files: ['some/path'],
                            browsers: ['b3']
                        }
                    }
                });
            }, GeminiError);
        });

        it('should accept configured browsers', () => {
            const config = createConfig({
                browsers: {
                    b1: {},
                    b2: {}
                },
                sets: {
                    set1: {
                        files: ['some/path'],
                        browsers: ['b1']
                    },
                    set2: {
                        files: ['other/path'],
                        browsers: ['b2']
                    }
                }
            });

            assert.deepEqual(config.sets.set1.browsers, ['b1']);
            assert.deepEqual(config.sets.set2.browsers, ['b2']);
        });
    });

    it('should not have default set if sets are not specified', () => {
        const config = createConfig({
            browsers: {
                b1: {},
                b2: {}
            }
        });

        assert.deepEqual(config.sets, {});
    });
});
