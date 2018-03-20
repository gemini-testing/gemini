'use strict';

const Suite = require('lib/suite');
const SkipBuilder = require('lib/tests-api/skip/skip-builder');

describe('tests-api/skip/skip-builder', () => {
    const sandbox = sinon.sandbox.create();
    let suite;
    let skipBuilder;

    beforeEach(() => {
        suite = Suite.create('');
        skipBuilder = new SkipBuilder(suite);
    });

    afterEach(() => {
        sandbox.restore();
    });

    const errorMessage = 'Browsers must be an array with strings and RegExp objects';

    const testShouldThrow = (method) => {
        describe('should throw', () => {
            it('without an argument', () => {
                assert.throws(() => {
                    skipBuilder[method]();
                }, TypeError, errorMessage);
            });

            it('if argument is not a string or RegExp', () => {
                assert.throws(() => {
                    skipBuilder[method](0);
                }, TypeError, errorMessage);
            });

            it('if argument is array with non-string or non-RegExp', () => {
                assert.throws(() => {
                    skipBuilder[method]([false]);
                }, TypeError, errorMessage);
            });

            it('if argument is an object', () => {
                assert.throws(() => {
                    skipBuilder[method]({browserName: 'name', version: '123', id: 'browser'});
                }, TypeError, errorMessage);
            });
        });
    };

    describe('in', () => {
        testShouldThrow('in');

        describe('should accept', () => {
            it('browser string id', () => {
                skipBuilder.in('opera');

                assert.isTrue(suite.shouldSkip('opera'));
                assert.isFalse(suite.shouldSkip('firefox'));
            });

            it('browser RegExp', () => {
                skipBuilder.in(/ie1.*/);

                assert.isTrue(suite.shouldSkip('ie11'));
                assert.isFalse(suite.shouldSkip('ie8'));
            });

            it(`array of string ids and RegExp's`, () => {
                skipBuilder.in([
                    'ie11',
                    /firefox/
                ]);

                assert.isTrue(suite.shouldSkip('ie11'));
                assert.isTrue(suite.shouldSkip('firefox33'));
                assert.isFalse(suite.shouldSkip('chrome'));
            });

            it('empty array', () => {
                skipBuilder.in([]);

                assert.isFalse(suite.shouldSkip('any_browser'));
            });

            it('comments', () => {
                skipBuilder.in('chrome', 'comment');

                assert.isTrue(suite.shouldSkip('chrome'));
                assert.equal(suite.skipComment, 'comment');
            });
        });

        it('should chain skip methods', () => {
            skipBuilder
                .in('ie11')
                .in(/firefox/);

            assert.isTrue(suite.shouldSkip('ie11'));
            assert.isTrue(suite.shouldSkip('firefox33'));
            assert.isFalse(suite.shouldSkip('chrome'));
        });
    });

    describe('notIn', () => {
        testShouldThrow('notIn');

        describe('should accept', () => {
            it('browser string id', () => {
                skipBuilder.notIn('opera');

                assert.equal(suite.skipped.length, 1);
                assert.isFalse(suite.shouldSkip('opera'));
                assert.isTrue(suite.shouldSkip('firefox'));
            });

            it('browser RegExp', () => {
                skipBuilder.notIn(/ie1.*/);

                assert.isFalse(suite.shouldSkip('ie11'));
                assert.isTrue(suite.shouldSkip('ie8'));
            });

            it(`array of string ids and RegExp's`, () => {
                skipBuilder.notIn([
                    'ie11',
                    /firefox/
                ]);

                assert.isTrue(suite.shouldSkip('chrome'));
                assert.isFalse(suite.shouldSkip('ie11'));
                assert.isFalse(suite.shouldSkip('firefox33'));
            });

            it('empty array', () => {
                skipBuilder.notIn([]);

                assert.isTrue(suite.shouldSkip('any_browser'));
            });

            it('comments', () => {
                skipBuilder.notIn('chrome', 'comment');

                assert.isTrue(suite.shouldSkip('firefox'));
                assert.equal(suite.skipComment, 'comment');
            });
        });

        it('should chain skip.notIn methods', () => {
            skipBuilder
                .notIn('ie11', 'not in ie11')
                .notIn(/firefox/, 'not in firefox');

            assert.isTrue(suite.shouldSkip('firefox33'));
            assert.equal(suite.skipComment, 'not in ie11');
            assert.isTrue(suite.shouldSkip('ie11'));
            assert.equal(suite.skipComment, 'not in firefox');
        });
    });

    describe('buildAPI', () => {
        let api;

        beforeEach(() => {
            api = skipBuilder.buildAPI(suite);
        });

        describe('skip.in', () => {
            it(`should call SkipBuilder's .in method`, () => {
                sandbox.spy(skipBuilder, 'in');

                api.skip.in(['browsers'], 'comment');

                assert.calledWith(skipBuilder.in, ['browsers'], 'comment');
            });

            it('should return suite instance', () => {
                const returnValue = api.skip.in(['browsers'], 'comment');

                assert.equal(returnValue, suite);
            });
        });

        describe('skip.notIn', () => {
            it(`should call SkipBuilder's .notIn method`, () => {
                sandbox.spy(skipBuilder, 'notIn');

                api.skip.notIn(['browsers'], 'comment');

                assert.calledWith(skipBuilder.notIn, ['browsers'], 'comment');
            });

            it('should return suite instance', () => {
                const returnValue = api.skip.notIn(['browsers'], 'comment');

                assert.equal(returnValue, suite);
            });
        });

        describe('skip', () => {
            beforeEach(() => {
                sandbox.spy(skipBuilder, 'in');
            });

            it(`should call SkipBuilder's .in method`, () => {
                api.skip(['browsers'], 'comment');

                assert.calledWith(skipBuilder.in, ['browsers'], 'comment');
            });

            it('should return suite instance', () => {
                const returnValue = api.skip(['browsers'], 'comment');

                assert.equal(returnValue, suite);
            });

            it('should skip all browsers if no argument', () => {
                api.skip();

                assert.calledWith(skipBuilder.in, /.*/);
            });

            describe('falsey values', () => {
                const skipAllTest = (arg, argDescription = arg) => {
                    return it(`should skip all browsers if argument is ${argDescription}`, () => {
                        api.skip(arg);

                        assert.calledWith(skipBuilder.in, /.*/);
                    });
                };

                skipAllTest(undefined);
                skipAllTest(false);
                skipAllTest(0);
                skipAllTest(null);
                skipAllTest('', 'empty string');
            });
        });
    });
});
