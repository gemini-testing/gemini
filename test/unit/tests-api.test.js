'use strict';

var testsApi = require('../../lib/tests-api'),
    Suite = require('../../lib/suite');

describe('public tests API', function() {
    beforeEach(function() {
        this.suite = Suite.create('');
        this.context = {};
        testsApi(this.context, this.suite);
    });

    describe('.suite method', function() {
        it('should throw an error if first argument is not a string', function() {
            assert.throws(function() {
                this.context.suite(123, function() {});
            }, TypeError);
        });

        it('should throw an error if second argument is not a function', function() {
            assert.throws(function() {
                this.context.suite('name');
            }, TypeError);
        });

        it('should create new suite with corresponding name', function() {
            this.context.suite('name', function() {});

            assert.equal(this.suite.children[0].name, 'name');
        });

        it('should call callback', function() {
            var spy = sinon.spy();
            this.context.suite('name', spy);
            assert.called(spy);
        });

        it('should created nested suites when called nestedly', function() {
            var _this = this;
            this.context.suite('name', function() {
                _this.context.suite('child', function() {});
            });

            assert.equal(this.suite.children[0].children[0].name, 'child');
        });

        it('should not allow create two child suites of the same name', function() {
            var _this = this;

            assert.throws(function() {
                _this.context.suite('name', function() {
                    _this.context.suite('child', function() {});
                    _this.context.suite('child', function() {});
                });
            });
        });

        it('should create non-nested suite at the root level', function() {
            this.context.suite('first', function() {});
            this.context.suite('second', function() {});

            assert.equal(this.suite.children[1].name, 'second');
        });

        it('should throw when suite has states but does not has URL', function() {
            var _this = this;
            assert.throws(function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element')
                         .capture('plain');
                });
            });
        });

        it('should throw when suite has no states nor URL', function() {
            var _this = this;
            assert.doesNotThrow(function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                });
            });
        });

        it('should not throw when suite has states and url is inherited from parent', function() {
            var _this = this;
            assert.doesNotThrow(function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url');
                    _this.context.suite('child', function(suite) {
                        suite.setCaptureElements('.element')
                             .capture('plain');
                    });
                });
            });
        });

        it('should throw if suite has states but does not has captureSelectors', function() {
            var _this = this;
            assert.throws(function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url')
                         .capture('plain');
                });
            });
        });

        it('should not throw if suite has no states nor captureSelectors', function() {
            var _this = this;
            assert.doesNotThrow(function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url');
                });
            });
        });

        it('should not throw when suite has states and captureSelectors are inherited from parent', function() {
            var _this = this;
            assert.doesNotThrow(function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                    _this.context.suite('child', function(suite) {
                        suite.setUrl('/url')
                             .capture('plain');
                    });
                });
            });
        });

        it('should assign suite ids', function() {
            this.context.suite('suite', function() {});
            assert.equal(this.suite.children[0].id, 1);
        });

        it('should assign incrementing suite ids for following suites', function() {
            this.context.suite('suite', function() {});
            this.context.suite('suite2', function() {});
            assert.equal(this.suite.children[1].id, 2);
        });

        it('should assign incrementing suite ids for child suites', function() {
            var _this = this;
            this.context.suite('suite', function() {
                _this.context.suite('suite2', function() {});
            });
            assert.equal(this.suite.children[0].children[0].id, 2);
        });

        it('should assign child suite ids before siblings', function() {
            var _this = this;
            this.context.suite('suite', function() {
                _this.context.suite('suite2', function() {});
            });

            this.context.suite('suite3', function() {});

            assert.equal(this.suite.children[0].children[0].id, 2);
            assert.equal(this.suite.children[1].id, 3);
        });
    });

    describe('suite builder', function() {
        function shouldBeChainable(method, value) {
            it('should be chainable', function(done) {
                this.context.suite('name', function(suite) {
                    assert.equal(suite[method](value), suite);
                    done();
                });
            });
        }

        describe('setUrl', function() {
            it('should throw if argument is not a string', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.setUrl({not: 'a string'});
                    });
                }.bind(this), TypeError);
            });

            it('should set url property', function() {
                this.context.suite('name', function(suite) {
                    suite.setUrl('http://example.com');
                });

                assert.equal(this.suite.children[0].url, 'http://example.com');
            });

            shouldBeChainable('setUrl', 'http://example.com');
        });

        describe('setTolerance', function() {
            it('should throw if argument is not a string', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.setTolerance('so much');
                    });
                }.bind(this), TypeError);
            });

            it('should set tolerance passed as number', function() {
                this.context.suite('name', function(suite) {
                    suite.setTolerance(25);
                });
                assert.equal(this.suite.children[0].tolerance, 25);
            });

            shouldBeChainable('setTolerance', 25);
        });

        function testSelectorListProperty(method, property) {
            describe(method, function() {
                beforeEach(function() {
                    this.callTestMethod = function() {
                        var args = Array.prototype.slice.call(arguments);
                        this.context.suite('name', function(suite) {
                            suite[method].apply(suite, args);
                        });
                    }.bind(this);
                });

                it ('should throw if selector is not a string', function() {
                    assert.throws(function() {
                        this.callTestMethod({everything: true});
                    }.bind(this), TypeError);
                });

                it ('should throw if selector in array is not a string', function() {
                    assert.throws(function() {
                        this.callTestMethod([{everything: true}, '.selector']);
                    }.bind(this), TypeError);
                });

                it('should set ' + property + ' property', function() {
                    this.callTestMethod('.selector');

                    assert.deepEqual(this.suite.children[0][property], ['.selector']);
                });

                it('should accept multiple arguments', function() {
                    this.callTestMethod('.selector1', '.selector2');
                    assert.deepEqual(this.suite.children[0][property], ['.selector1', '.selector2']);
                });

                it('should accept array', function() {
                    this.callTestMethod(['.selector1', '.selector2']);

                    assert.deepEqual(this.suite.children[0][property], ['.selector1', '.selector2']);
                });
            });
        }

        testSelectorListProperty('setCaptureElements', 'captureSelectors');
        testSelectorListProperty('ignoreElements', 'ignoreSelectors');

        function testHook(name) {
            var hookProperty = name + 'Hook';
            describe(name, function() {
                it('should set ' + hookProperty + ' property', function() {
                    var func = function() {};
                    this.context.suite('name', function(suite) {
                        suite[name](func);
                    });
                    assert.equal(this.suite.children[0][hookProperty], func);
                });

                it('should throw if hook is not a function', function() {
                    assert.throws(function() {
                        this.context.suite('name', function(suite) {
                            suite[name]('the dawn');
                        });
                    }.bind(this), TypeError);
                });
            });
        }

        testHook('before');
        testHook('after');

        describe('capture', function() {
            function prepareSuite(suite) {
                return suite.setUrl('/path')
                            .setCaptureElements('.element');
            }

            it('should throw if first argument is not passed', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture({not: 'a string'});
                    });
                }.bind(this), TypeError);
            });

            it('should throw if second argument is not a function', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture('state', 'make me a sandwich');
                    });
                }.bind(this), TypeError);
            });

            it('should not throw if second argument is absent', function() {
                assert.doesNotThrow(function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture('state');
                    });
                }.bind(this));
            });

            it('should create named state', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state');
                });

                assert.equal(this.suite.children[0].states[0].name, 'state');
            });

            it('should throw if state with such name already exists', function() {
                var _this = this;
                assert.throws(function() {
                    _this.context.suite('name', function(suite) {
                        suite.capture('state');
                        suite.capture('state');
                    });
                });
            });

            it('should allow to have multiple states of different names', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite)
                        .capture('state 1')
                        .capture('state 2');
                });

                assert.equal(this.suite.children[0].states[0].name, 'state 1');
                assert.equal(this.suite.children[0].states[1].name, 'state 2');
            });

            it('should make new state reference the suite', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state');
                });

                assert.equal(this.suite.children[0].states[0].suite, this.suite.children[0]);
            });

            it('should store passed callback', function() {
                var spy = sinon.spy();
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state', spy);
                });

                assert.equal(this.suite.children[0].states[0].callback, spy);
            });

            it('should allow to set tolerance', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state', {tolerance: 25}, function() {});
                });
                assert.equal(this.suite.children[0].states[0].tolerance, 25);
            });

            it('should throw if tolerance is not a number', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture('state', {tolerance: 'so much'}, function() {});
                    });
                }, TypeError);
            });

            it('should be chainable', function(done) {
                this.context.suite('name', function(suite) {
                    assert.equal(prepareSuite(suite).capture('state'), suite);
                    done();
                });
            });
        });

        describe('skip', function() {
            it('should throw if argument is not a string nor RegExp', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.skip(123);
                    });
                }.bind(this), TypeError);
            });

            it('should throw if argument is array with non-string or non-RegExp', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.skip([123]);
                    });
                }.bind(this), TypeError);
            });

            it('should throw if argument is an object', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.skip({browserName: 'name', version: '123', id: 'browser'});
                    });
                }.bind(this), Error);
            });

            it('should mark suite as skipped', function() {
                this.context.suite('name', function(suite) {
                    suite.skip();
                });
                assert.isTrue(this.suite.children[0].skipped);
            });

            it('should accept skipped browser string id', function() {
                this.context.suite('name', function(suite) {
                    suite.skip('opera');
                });

                assert.equal(this.suite.children[0].skipped.length, 1);
                assert.isTrue(this.suite.children[0].skipped[0].matches('opera'));
                assert.isFalse(this.suite.children[0].skipped[0].matches('firefox'));
            });

            it('should accept skipped browser RegExp', function() {
                this.context.suite('name', function(suite) {
                    suite.skip(/ie1.*/);
                });

                assert.isTrue(this.suite.children[0].skipped[0].matches('ie11'));
                assert.isFalse(this.suite.children[0].skipped[0].matches('ie8'));
            });

            it('should accept array of string ids and RegExp\'s', function() {
                this.context.suite('name', function(suite) {
                    suite.skip([
                        'ie11',
                        /firefox/
                    ]);
                });

                assert.isTrue(this.suite.children[0].skipped[0].matches('ie11'));
                assert.isTrue(this.suite.children[0].skipped[1].matches('firefox33'));
            });
        });

        describe('browsers', function() {
            var setRootSuiteBrowsers;

            before(function() {
                setRootSuiteBrowsers = function(browsers) {
                    testsApi(this.context, this.suite, browsers);
                }.bind(this);
            });

            it('should throw without an argument', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.browsers();
                    });
                }.bind(this), /string or RegExp/);
            });

            it('should throw if an argument is not a string or RegExp', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.browsers(123);
                    });
                }.bind(this), /string or RegExp/);
            });

            it('should throw if an argument is an array of non-strings or non-RegExps', function() {
                assert.throws(function() {
                    this.context.suite('name', function(suite) {
                        suite.browsers([123]);
                    });
                }.bind(this), /string or RegExp/);
            });

            it('should filter suite browsers by a string', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers('chrome');
                });

                assert.deepEqual(this.suite.children[0].browsers, ['chrome']);
            });

            it('should filter suite browsers by a RegExp', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers(/ie.+/);
                });

                assert.deepEqual(this.suite.children[0].browsers, ['ie8', 'ie9']);
            });

            it('should filter suite browsers by an array of strings', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers(['chrome']);
                });

                assert.deepEqual(this.suite.children[0].browsers, ['chrome']);
            });

            it('should filter suite browsers by an array of RegExps', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers([/ie.+/]);
                });

                assert.deepEqual(this.suite.children[0].browsers, ['ie8', 'ie9']);
            });

            it('should filter suite browsers by an array of strings and RegExps', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'opera', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers([/ie.+/, 'chrome']);
                });

                assert.deepEqual(this.suite.children[0].browsers, ['ie8', 'ie9', 'chrome']);
            });

            it('should filter browsers in all children suites', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'opera', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers([/ie.+/, 'chrome']);

                    this.context.suite('first-child-name', function(suite) {
                        suite.browsers(/ie.+/);
                    });

                    this.context.suite('second-child-name', function(suite) {
                        suite.browsers('chrome');
                    });
                }.bind(this));

                assert.deepEqual(this.suite.children[0].browsers, ['ie8', 'ie9', 'chrome']);
                assert.deepEqual(this.suite.children[0].children[0].browsers, ['ie8', 'ie9']);
                assert.deepEqual(this.suite.children[0].children[1].browsers, ['chrome']);
            });

            it('should pass filtered browsers from a parent suite to a child one', function() {
                setRootSuiteBrowsers(['ie8', 'ie9', 'opera', 'chrome']);

                this.context.suite('name', function(suite) {
                    suite.browsers('chrome');

                    this.context.suite('child-name', function(suite) {});
                }.bind(this));

                assert.deepEqual(this.suite.children[0].children[0].browsers, ['chrome']);
            });

            it('should not set a browser for a suite if it is not specified in a root one', function() {
                setRootSuiteBrowsers(['opera']);

                this.context.suite('name', function(suite) {
                    suite.browsers('chrome');
                });

                assert.deepEqual(this.suite.children[0].browsers, []);
            });

            it('should be chainable', function() {
                this.context.suite('name', function(suite) {
                    assert.deepEqual(suite.browsers([]), suite);
                });
            });
        });
    });
});
