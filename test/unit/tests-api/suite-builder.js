'use strict';

var SuiteBuilder = require('../../../lib/tests-api/suite-builder'),
    Suite = require('../../../lib/suite');

describe('tests-api/suite-builder', function() {
    var suite,
        suiteBuilder;

    beforeEach(function() {
        suite = Suite.create('');
        suiteBuilder = new SuiteBuilder(suite);
    });

    describe('setUrl', function() {
        it('should throw if argument is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setUrl({not: 'a string'});
            }, TypeError);
        });

        it('should set url property', function() {
            suiteBuilder.setUrl('http://example.com');
            assert.equal(suite.url, 'http://example.com');
        });

        it('should be chainable', function() {
            assert.equal(
                suiteBuilder.setUrl(''),
                suiteBuilder
            );
        });
    });

    describe('setTolerance', function() {
        it('should throw if argument is not a string', function() {
            assert.throws(function() {
                suiteBuilder.setTolerance('so much');
            }, TypeError);
        });

        it('should set tolerance passed as number', function() {
            suiteBuilder.setTolerance(25);
            assert.equal(suite.tolerance, 25);
        });

        it('should be chainable', function() {
            assert.equal(
                suiteBuilder.setTolerance(0),
                suiteBuilder
            );
        });
    });

    testSelectorListProperty('setCaptureElements', 'captureSelectors');
    testSelectorListProperty('ignoreElements', 'ignoreSelectors');

    function testSelectorListProperty(method, property) {
        describe(method, function() {
            it ('should throw if selector is not a string', function() {
                assert.throws(function() {
                    suiteBuilder[method]({everything: true});
                }, TypeError);
            });

            it ('should throw if selector in array is not a string', function() {
                assert.throws(function() {
                    suiteBuilder[method]([{everything: true}, '.selector']);
                }, TypeError);
            });

            it('should set ' + property + ' property', function() {
                suiteBuilder[method]('.selector');

                assert.deepEqual(suite[property], ['.selector']);
            });

            it('should accept multiple arguments', function() {
                suiteBuilder[method]('.selector1', '.selector2');
                assert.deepEqual(suite[property], ['.selector1', '.selector2']);
            });

            it('should accept array', function() {
                suiteBuilder[method](['.selector1', '.selector2']);

                assert.deepEqual(suite[property], ['.selector1', '.selector2']);
            });
        });
    }

    testHook('before');
    testHook('after');

    function testHook(name) {
        var hookProperty = name + 'Hook';
        describe(name, function() {
            it('should set ' + hookProperty + ' property', function() {
                var func = sinon.stub();

                suiteBuilder[name](func);
                assert.equal(suite[hookProperty], func);
            });

            it('should throw if hook is not a function', function() {
                assert.throws(function() {
                    suiteBuilder[name]('the dawn');
                }, TypeError);
            });
        });
    }

    describe('capture', function() {
        beforeEach(function() {
            suiteBuilder
                .setUrl('/path')
                .setCaptureElements('.element');
        });

        it('should throw if first argument is not passed', function() {
            assert.throws(function() {
                suiteBuilder.capture({not: 'a string'});
            }, TypeError);
        });

        it('should throw if second argument is not a function', function() {
            assert.throws(function() {
                suiteBuilder.capture('state', 'make me a sandwich');
            }, TypeError);
        });

        it('should not throw if second argument is absent', function() {
            assert.doesNotThrow(function() {
                suiteBuilder.capture('state');
            });
        });

        it('should create named state', function() {
            suiteBuilder.capture('state');
            assert.equal(suite.states[0].name, 'state');
        });

        it('should throw if state with such name already exists', function() {
            assert.throws(function() {
                suiteBuilder.capture('state');
                suiteBuilder.capture('state');
            });
        });

        it('should allow to have multiple states of different names', function() {
            suiteBuilder
                .capture('state 1')
                .capture('state 2');

            assert.equal(suite.states[0].name, 'state 1');
            assert.equal(suite.states[1].name, 'state 2');
        });

        it('should make new state reference the suite', function() {
            suiteBuilder.capture('state');
            assert.equal(suite.states[0].suite, suite);
        });

        it('should store passed callback', function() {
            var spy = sinon.spy();

            suiteBuilder.capture('state', spy);

            assert.equal(suite.states[0].callback, spy);
        });

        it('should allow to set tolerance', function() {
            suiteBuilder.capture('state', {tolerance: 25}, function() {});
            assert.equal(suite.states[0].tolerance, 25);
        });

        it('should throw if tolerance is not a number', function() {
            assert.throws(function() {
                suiteBuilder.capture('state', {tolerance: 'so much'}, function() {});
            }, TypeError);
        });

        it('should be chainable', function() {
            assert.equal(suiteBuilder.capture('state'), suiteBuilder);
        });
    });

    describe('skip', function() {
        it('should throw if argument is not a string nor RegExp', function() {
            assert.throws(function() {
                suiteBuilder.skip(123);
            }, TypeError);
        });

        it('should throw if argument is array with non-string or non-RegExp', function() {
            assert.throws(function() {
                suiteBuilder.skip([123]);
            }, TypeError);
        });

        it('should throw if argument is an object', function() {
            assert.throws(function() {
                suiteBuilder.skip({browserName: 'name', version: '123', id: 'browser'});
            }, Error);
        });

        it('should mark suite as skipped', function() {
            suiteBuilder.skip();
            assert.isTrue(suite.skipped);
        });

        it('should accept skipped browser string id', function() {
            suiteBuilder.skip('opera');

            assert.equal(suite.skipped.length, 1);
            assert.isTrue(suite.skipped[0].matches('opera'));
            assert.isFalse(suite.skipped[0].matches('firefox'));
        });

        it('should accept skipped browser RegExp', function() {
            suiteBuilder.skip(/ie1.*/);

            assert.isTrue(suite.skipped[0].matches('ie11'));
            assert.isFalse(suite.skipped[0].matches('ie8'));
        });

        it('should accept array of string ids and RegExp\'s', function() {
            suiteBuilder.skip([
                'ie11',
                /firefox/
            ]);

            assert.isTrue(suite.skipped[0].matches('ie11'));
            assert.isTrue(suite.skipped[1].matches('firefox33'));
        });
    });

    describe('browsers', function() {
        var rootSuite;

        beforeEach(function() {
            rootSuite = Suite.create('');
            suite = Suite.create('', rootSuite);
            suiteBuilder = new SuiteBuilder(suite);
        });

        it('should throw without an argument', function() {
            assert.throws(function() {
                suiteBuilder.browsers();
            }, /string or RegExp/);
        });

        it('should throw if an argument is not a string or RegExp', function() {
            assert.throws(function() {
                suiteBuilder.browsers(123);
            }, /string or RegExp/);
        });

        it('should throw if an argument is an array of non-strings or non-RegExps', function() {
            assert.throws(function() {
                suiteBuilder.browsers([123]);
            }, /string or RegExp/);
        });

        it('should filter suite browsers by a string', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(suite.browsers, ['chrome']);
        });

        it('should filter suite browsers by a RegExp', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers(/ie.+/);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9']);
        });

        it('should filter suite browsers by an array of strings', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers(['chrome']);

            assert.deepEqual(suite.browsers, ['chrome']);
        });

        it('should filter suite browsers by an array of RegExps', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'chrome'];

            suiteBuilder.browsers([/ie.+/]);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9']);
        });

        it('should filter suite browsers by an array of strings and RegExps', function() {
            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers([/ie.+/, 'chrome']);

            assert.deepEqual(suite.browsers, ['ie8', 'ie9', 'chrome']);
        });

        it('should not set a browser for a suite if it is not specified in a root one', function() {
            rootSuite.browsers = ['opera'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(suite.browsers, []);
        });

        it('should be chainable', function() {
            assert.equal(suiteBuilder.browsers([]), suiteBuilder);
        });

        it('should filter browsers in all children suites', function() {
            var firstChild = Suite.create('firstChild', suite),
                secondChild = Suite.create('secondChild', suite);

            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers([/ie.+/, 'chrome']);
            new SuiteBuilder(firstChild).browsers(/ie.+/);
            new SuiteBuilder(secondChild).browsers('chrome');

            assert.deepEqual(suite.browsers, ['ie8', 'ie9', 'chrome']);
            assert.deepEqual(firstChild.browsers, ['ie8', 'ie9']);
            assert.deepEqual(secondChild.browsers, ['chrome']);
        });

        it('should pass filtered browsers from a parent suite to a child one', function() {
            var childSuite = Suite.create('child', suite);

            rootSuite.browsers = ['ie8', 'ie9', 'opera', 'chrome'];

            suiteBuilder.browsers('chrome');

            assert.deepEqual(childSuite.browsers, ['chrome']);
        });
    });
});
