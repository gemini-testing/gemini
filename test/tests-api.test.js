'use strict';

var sinon = require('sinon'),
    testsApi = require('../lib/tests-api'),
    Suite = require('../lib/suite');

describe('public tests API', function() {
    beforeEach(function() {
        this.suite = Suite.create('');
        this.context = {};
        testsApi(this.context, this.suite);
    });

    describe('.suite method', function() {
        it('should throw an error if first argument is not a string', function() {
            (function() {
                this.context.suite(123, function() {});
            }.must.throw(TypeError));
        });

        it('should throw an error if second argument is not a function', function() {
            (function() {
                this.context.suite('name');
            }.must.throw(TypeError));
        });

        it('should create new suite with corresponding name', function() {
            this.context.suite('name', function() {});

            this.suite.children[0].name.must.equal('name');
        });

        it('should call callback', function() {
            var spy = sinon.spy();
            this.context.suite('name', spy);
            sinon.assert.called(spy);
        });

        it('should created nested suites when called nestedly', function() {
            var _this = this;
            this.context.suite('name', function() {
                _this.context.suite('child', function() {});
            });

            this.suite.children[0].children[0].name.must.be('child');
        });

        it('should not allow create two child suites of the same name', function() {
            var _this = this;

            (function() {
                _this.context.suite('name', function() {
                    _this.context.suite('child', function() {});
                    _this.context.suite('child', function() {});
                });
            }.must.throw());
        });

        it('should create non-nested suite at the root level', function() {
            this.context.suite('first', function() {});
            this.context.suite('second', function() {});

            this.suite.children[1].name.must.be('second');
        });

        it('should throw when suite has states but does not has URL', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element')
                         .capture('plain');
                });
            }.must.throw());
        });

        it('should throw when suite has no states nor URL', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                });
            }.must.not.throw());
        });

        it('should not throw when suite has states and url is inherited from parent', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url');
                    _this.context.suite('child', function(suite) {
                        suite.setCaptureElements('.element')
                             .capture('plain');
                    });
                });
            }.must.not.throw());
        });

        it('should throw if suite has states but does not has captureSelectors', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url')
                         .capture('plain');
                });
            }.must.throw());
        });

        it('should not throw if suite has no states nor captureSelectors', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setUrl('/url');
                });
            }.must.not.throw());
        });

        it('should not throw when suite has states and captureSelectors are inherited from parent', function() {
            var _this = this;
            (function() {
                _this.context.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                    _this.context.suite('child', function(suite) {
                        suite.setUrl('/url')
                             .capture('plain');
                    });
                });
            }.must.not.throw());
        });

        it('should assign suite ids', function() {
            this.context.suite('suite', function() {});
            this.suite.children[0].id.must.be(1);
        });

        it('should assign incrementing suite ids for following suites', function() {
            this.context.suite('suite', function() {});
            this.context.suite('suite2', function() {});
            this.suite.children[1].id.must.be(2);
        });

        it('should assign incrementing suite ids for child suites', function() {
            var _this = this;
            this.context.suite('suite', function() {
                _this.context.suite('suite2', function() {});
            });
            this.suite.children[0].children[0].id.must.be(2);
        });

        it('should assign child suite ids before siblings', function() {
            var _this = this;
            this.context.suite('suite', function() {
                _this.context.suite('suite2', function() {});
            });

            this.context.suite('suite3', function() {});

            this.suite.children[0].children[0].id.must.be(2);
            this.suite.children[1].id.must.be(3);
        });
    });

    describe('suite builder', function() {
        function shouldBeChainable(method, value) {
            it('should be chainable', function(done) {
                this.context.suite('name', function(suite) {
                    suite[method](value).must.be(suite);
                    done();
                });
            });
        }

        describe('setUrl', function() {
            it('should throw if argument is not a string', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.setUrl({not: 'a string'});
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should set url property', function() {
                this.context.suite('name', function(suite) {
                    suite.setUrl('http://example.com');
                });

                this.suite.children[0].url.must.equal('http://example.com');
            });

            shouldBeChainable('setUrl', 'http://example.com');
        });

        describe('setCaptureElements', function() {
            it ('should throw if selector is not a string', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.setCaptureElements({everything: true});
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it ('should throw if selector in array is not a string', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.setCaptureElements([{everything: true}, '.selector']);
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should set captureSelectors property', function() {
                this.context.suite('name', function(suite) {
                    suite.setCaptureElements('.selector');
                });

                this.suite.children[0].captureSelectors.must.eql(['.selector']);
            });

            it('should accept multiple arguments', function() {
                this.context.suite('name', function(suite) {
                    suite.setCaptureElements('.selector1', '.selector2');
                });
                this.suite.children[0].captureSelectors.must.eql(['.selector1', '.selector2']);
            });

            it('should accept array', function() {
                this.context.suite('name', function(suite) {
                    suite.setCaptureElements(['.selector1', '.selector2']);
                });

                this.suite.children[0].captureSelectors.must.eql(['.selector1', '.selector2']);
            });
        });

        function testHook(name) {
            var hookProperty = name + 'Hook';
            describe(name, function() {
                it('should set ' + hookProperty + ' property', function() {
                    var func = function() {};
                    this.context.suite('name', function(suite) {
                        suite[name](func);
                    });
                    this.suite.children[0][hookProperty].must.be(func);
                });

                it('should throw if hook is not a function', function() {
                    (function() {
                        this.context.suite('name', function(suite) {
                            suite[name]('the dawn');
                        });
                    }.bind(this)).must.throw(TypeError);
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
                (function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture({not: 'a string'});
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should throw if second argument is not a function', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture('state', 'make me a sandwich');
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should not throw if second argument is absent', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        prepareSuite(suite).capture('state');
                    });
                }.bind(this)).must.not.throw();
            });

            it('should create named state', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state');
                });

                this.suite.children[0].states[0].name.must.equal('state');
            });

            it('should throw if state with such name already exists', function() {
                var _this = this;
                (function() {
                    _this.context.suite('name', function(suite) {
                        suite.capture('state');
                        suite.capture('state');
                    });
                }.must.throw());
            });

            it('should allow to have multiple states of different names', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite)
                        .capture('state 1')
                        .capture('state 2');
                });

                this.suite.children[0].states[0].name.must.equal('state 1');
                this.suite.children[0].states[1].name.must.equal('state 2');
            });

            it('should make new state reference the suite', function() {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state');
                });

                this.suite.children[0].states[0].suite.must.equal(this.suite.children[0]);
            });

            it('should store passed callback', function() {
                var spy = sinon.spy();
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state', spy);
                });

                this.suite.children[0].states[0].callback.must.be(spy);
            });

            it('should be chainable', function(done) {
                this.context.suite('name', function(suite) {
                    prepareSuite(suite).capture('state').must.be(suite);
                    done();
                });
            });
        });

        describe('skip', function() {
            it('should throw if argument is not a string nor object', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.skip(123);
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should throw if argument is array with non-string or non-object', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.skip([123]);
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should throw if argument is an object and browser name is not specified', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.skip({iHaveNo: 'name'});
                    });
                }.bind(this)).must.throw(Error);
            });

            it('should throw if browser name is not a string', function() {
                (function() {
                    this.context.suite('browserName', function(suite) {
                        suite.skip({browserName: true});
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should throw if browser version is not a string', function() {
                (function() {
                    this.context.suite('name', function(suite) {
                        suite.skip({browserName: 'browser', version: {major: 42}});
                    });
                }.bind(this)).must.throw(TypeError);
            });

            it('should mark suite as skipped', function() {
                this.context.suite('name', function(suite) {
                    suite.skip();
                });
                this.suite.children[0].skipped.must.be.true();
            });

            it('should accept skipped browser name', function() {
                this.context.suite('name', function(suite) {
                    suite.skip('opera');
                });

                this.suite.children[0].skipped[0].must.be.eql({browserName: 'opera'});
            });

            it('should accept browser object', function() {
                this.context.suite('name', function(suite) {
                    suite.skip({browserName: 'opera'});
                });

                this.suite.children[0].skipped[0].must.be.eql({browserName: 'opera'});
            });

            it('should accept array of objects', function() {
                this.context.suite('name', function(suite) {
                    suite.skip([
                        {browserName: 'opera'},
                        {browserName: 'chrome'}
                    ]);
                });

                this.suite.children[0].skipped.must.be.eql([
                    {browserName: 'opera'},
                    {browserName: 'chrome'}
                ]);
            });

            it('should accept array of strings', function() {
                this.context.suite('name', function(suite) {
                    suite.skip([
                        'opera',
                        'chrome'
                    ]);
                });

                this.suite.children[0].skipped.must.be.eql([
                    {browserName: 'opera'},
                    {browserName: 'chrome'}
                ]);
            });
        });
    });
});
