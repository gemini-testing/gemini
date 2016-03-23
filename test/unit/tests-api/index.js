'use strict';

var testsApi = require('../../../src/tests-api'),
    Suite = require('../../../src/suite');

describe('tests-api', function() {
    beforeEach(function() {
        this.suite = Suite.create('');
        this.context = {};
    });

    describe('.suite method', function() {
        beforeEach(function() {
            testsApi(this.context, this.suite);
        });

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

    describe('browsers', function() {
        var browsers = ['some-browser', 'other-browser'];

        beforeEach(function() {
            testsApi(this.context, this.suite, browsers);
        });

        it('should be set for top level suite', function() {
            this.context.suite('suite', function() {});

            assert.equal(this.suite.children[0].browsers, browsers);
            assert.isTrue(this.suite.children[0].hasOwnProperty('browsers'));
        });

        it('should not be set for not top level suite', function() {
            var _this = this;
            this.context.suite('suite', function() {
                _this.context.suite('child', function() {});
            });

            assert.equal(this.suite.children[0].children[0].browsers, browsers);
            assert.isFalse(this.suite.children[0].children[0].hasOwnProperty('browsers'));
        });
    });
});
