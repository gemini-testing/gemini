'use strict';
var q = require('q'),
    ClientBridge = require('../lib/browser/client-bridge'),
    StateError = require('../lib/errors/state-error'),
    assert = require('chai').assert,
    sinon = require('sinon'),

    makeBrowser = require('./util').makeBrowser,
    CALL_SCRIPT = 'typeof __gemini !== "undefined"? __gemini.example(1, "two") : {error: "ERRNOFUNC"})';

describe('ClientBridge', function() {
    beforeEach(function() {
        this.browser = sinon.stub(makeBrowser());
        this.browser.evalScript.returns(q({}));
        this.script = 'exampleScript()';
        this.bridge = new ClientBridge(this.browser, this.script);
    });

    describe('call', function() {
        it('should try to call a method on __gemini namespace', function() {
            var _this = this;
            return this.bridge.call('example', [1, 'two'])
                .then(function() {
                    assert.calledWith(
                        _this.browser.evalScript,
                       CALL_SCRIPT
                    );
                });
        });

        it('should allow to not specify the arguments', function() {
            var _this = this;
            return this.bridge.call('example')
                .then(function() {
                    assert.calledWith(
                        _this.browser.evalScript,
                        sinon.match('__gemini.example()')
                    );
                });
        });

        it('should return what evalScript returns if succeeded', function() {
            this.browser.evalScript.returns(q('result'));
            return assert.becomes(this.bridge.call('example'), 'result');
        });

        it('should reject if evalScript returns unexpected error', function() {
            var message = 'Something happened';
            this.browser.evalScript.returns(q({error: message}));
            var result = this.bridge.call('fail');
            return assert.isRejected(result, StateError, message);
        });

        it('should not attempt to call eval second if it return with unexpected error', function() {
            var _this = this;
            this.browser.evalScript.returns(q({error: 'unexpected'}));
            return assert.isRejected(this.bridge.call('fail'))
                .then(function() {
                    assert.calledOnce(_this.browser.evalScript);
                });
        });

        describe('if scripts were not injected', function() {
            beforeEach(function() {
                this.setupAsNonInjected = function(finalResult) {
                    this.browser.evalScript
                        .onFirstCall().returns(q({error: 'ERRNOFUNC'}))
                        .onThirdCall().returns(q(finalResult));

                    this.browser.evalScript
                        .withArgs(this.script)
                        .returns(q());
                };

                this.performCall = function() {
                    return this.bridge.call('example');
                };
            });

            it('should try to inject scripts', function() {
                this.setupAsNonInjected();
                var _this = this;
                return this.performCall()
                    .then(function() {
                        assert.calledWith(_this.browser.evalScript, _this.script);
                    });
            });

            it('should try to eval again after inject', function() {
                this.setupAsNonInjected();
                var _this = this;
                return this.bridge.call('example', [1, 'two'])
                    .then(function() {
                        assert.deepEqual(_this.browser.evalScript.thirdCall.args, [CALL_SCRIPT]);
                    });
            });

            it('should return result of the succesfull call', function() {
                this.setupAsNonInjected('success');
                return assert.becomes(this.performCall(), 'success');
            });

            it('should fail if scripts failed to inject', function() {
                this.setupAsNonInjected({error: 'ERRNOFUNC'});
                return assert.isRejected(this.performCall(), StateError);
            });
        });
    });
});
