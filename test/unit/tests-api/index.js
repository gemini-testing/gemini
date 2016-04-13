'use strict';

var testsAPI = require('../../../lib/tests-api'),
    Suite = require('../../../lib/suite');

describe('tests-api', function() {
    beforeEach(function() {
        this.suite = Suite.create('');
    });

    describe('.suite method', function() {
        var gemini;

        beforeEach(function() {
            gemini = testsAPI(this.suite);
        });

        it('should throw an error if first argument is not a string', function() {
            assert.throws(function() {
                gemini.suite(123, function() {});
            }, TypeError);
        });

        it('should throw an error if second argument is not a function', function() {
            assert.throws(function() {
                gemini.suite('name');
            }, TypeError);
        });

        it('should create new suite with corresponding name', function() {
            gemini.suite('name', function() {});

            assert.equal(this.suite.children[0].name, 'name');
        });

        it('should call callback', function() {
            var spy = sinon.spy();
            gemini.suite('name', spy);
            assert.called(spy);
        });

        it('should created nested suites when called nestedly', function() {
            gemini.suite('name', function() {
                gemini.suite('child', function() {});
            });

            assert.equal(this.suite.children[0].children[0].name, 'child');
        });

        it('should not allow create two child suites of the same name', function() {
            assert.throws(function() {
                gemini.suite('name', function() {
                    gemini.suite('child', function() {});
                    gemini.suite('child', function() {});
                });
            });
        });

        it('should create non-nested suite at the root level', function() {
            gemini.suite('first', function() {});
            gemini.suite('second', function() {});

            assert.equal(this.suite.children[1].name, 'second');
        });

        it('should throw when suite has states but does not has URL', function() {
            assert.throws(function() {
                gemini.suite('first', function(suite) {
                    suite.setCaptureElements('.element')
                         .capture('plain');
                });
            });
        });

        it('should throw when suite has no states nor URL', function() {
            assert.doesNotThrow(function() {
                gemini.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                });
            });
        });

        it('should not throw when suite has states and url is inherited from parent', function() {
            assert.doesNotThrow(function() {
                gemini.suite('first', function(suite) {
                    suite.setUrl('/url');
                    gemini.suite('child', function(suite) {
                        suite.setCaptureElements('.element')
                             .capture('plain');
                    });
                });
            });
        });

        it('should throw if suite has states but does not has captureSelectors', function() {
            assert.throws(function() {
                gemini.suite('first', function(suite) {
                    suite.setUrl('/url')
                         .capture('plain');
                });
            });
        });

        it('should not throw if suite has no states nor captureSelectors', function() {
            assert.doesNotThrow(function() {
                gemini.suite('first', function(suite) {
                    suite.setUrl('/url');
                });
            });
        });

        it('should not throw when suite has states and captureSelectors are inherited from parent', function() {
            assert.doesNotThrow(function() {
                gemini.suite('first', function(suite) {
                    suite.setCaptureElements('.element');
                    gemini.suite('child', function(suite) {
                        suite.setUrl('/url')
                             .capture('plain');
                    });
                });
            });
        });

        it('should assign suite ids', function() {
            gemini.suite('suite', function() {});
            assert.equal(this.suite.children[0].id, 1);
        });

        it('should assign incrementing suite ids for following suites', function() {
            gemini.suite('suite', function() {});
            gemini.suite('suite2', function() {});
            assert.equal(this.suite.children[1].id, 2);
        });

        it('should assign incrementing suite ids for child suites', function() {
            gemini.suite('suite', function() {
                gemini.suite('suite2', function() {});
            });
            assert.equal(this.suite.children[0].children[0].id, 2);
        });

        it('should assign child suite ids before siblings', function() {
            gemini.suite('suite', function() {
                gemini.suite('suite2', function() {});
            });

            gemini.suite('suite3', function() {});

            assert.equal(this.suite.children[0].children[0].id, 2);
            assert.equal(this.suite.children[1].id, 3);
        });
    });

    describe('browsers', function() {
        var browsers = ['some-browser', 'other-browser'],
            gemini;

        beforeEach(function() {
            gemini = testsAPI(this.suite, browsers);
        });

        it('should be set for top level suite', function() {
            gemini.suite('suite', function() {});

            assert.equal(this.suite.children[0].browsers, browsers);
            assert.isTrue(this.suite.children[0].hasOwnProperty('browsers'));
        });

        it('should not be set for not top level suite', function() {
            gemini.suite('suite', function() {
                gemini.suite('child', function() {});
            });

            assert.equal(this.suite.children[0].children[0].browsers, browsers);
            assert.isFalse(this.suite.children[0].children[0].hasOwnProperty('browsers'));
        });
    });
});
