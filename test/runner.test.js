'use strict';
var assert = require('assert'),
    q = require('q'),
    sinon = require('sinon'),
    createSuite = require('../lib/suite').create,
    State = require('../lib/state'),
    Config = require('../lib/config'),

    CONFIG_TEXT = [
        'rootUrl: http://example.com',
        'gridUrl: http://grid.example.com',
        'browsers: ',
        '  browser: browser'
    ].join('\n');

function addState(suite, name) {
    var state = new State(suite, name, function() {});
    suite.addState(state);
}

describe('runner', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();

        var browser = {
            id: 'browser',
            createActionSequence: this.sinon.stub().returns({
                perform: this.sinon.stub().returns(q.resolve())
            }),

            captureFullscreenImage: this.sinon.stub().returns(q({
                getSize: this.sinon.stub().returns(q({})),
                crop: this.sinon.stub().returns(q({}))
            })),

            prepareScreenshot: this.sinon.stub().returns(q({
                locationInBody: {},
                locationInViewport: {},
                cropSize: {}
            })),

            open: this.sinon.stub().returns(q.resolve()),
            quit: this.sinon.stub().returns(q.resolve())
        };

        this.browser = browser;
        this.launcher = {
            launch: this.sinon.stub().returns(q(browser)),
            stop: function() {}
        };

        this.root = createSuite('root');
        this.suite = createSuite('suite', this.root);
        this.suite.url = '/path';

        this.sinon.stub(require('child_process'), 'exec').withArgs('gm -version').callsArgWith(1, null, '', '');

        //require runner here to make stub above take effect
        var Runner = require('../lib/runner');
        this.runner = new Runner(new Config('/root', CONFIG_TEXT), this.launcher);
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('run', function() {
        it('should emit `begin` event when tests start', function() {
            var spy = this.sinon.spy().named('onBegin');
            this.runner.on('begin', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledOnce(spy);
            });
        });

        it('should pass total number of states when emitting `begin`', function() {
            addState(this.suite, '1');
            addState(this.suite, '2');
            var child = createSuite('child', this.suite);
            addState(child, '3');

            var spy = this.sinon.spy().named('onBegin');
            this.runner.on('begin', spy);

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, sinon.match({totalStates: 3}));
            });
        });

        it('should pass all browser names when emitting `begin`', function() {
            this.runner.config.browsers = {
                browser1: {browserName: 'browser1', version: '1'},
                browser2: {browserName: 'browser2'}
            };

            var spy = this.sinon.spy().named('onBegin');
            this.runner.on('begin', spy);

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, sinon.match({
                    browserIds: ['browser1', 'browser2']
                }));
            });
        });

        it('should pass config when emitting `begin`', function() {
            var spy = this.sinon.spy().named('onBegin');
            this.runner.on('begin', spy);

            var _this = this;
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, sinon.match({
                    config: _this.runner.config
                }));
            });
        });

        it('should launch each browser in config', function() {
            this.runner.config.browsers = {
                browser1: {browserName: 'browser1', version: '1'},
                browser2: {browserName: 'browser2'}
            };

            addState(this.suite, 'state');

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(this.launcher.launch, 'browser1');
                sinon.assert.calledWith(this.launcher.launch, 'browser2');
            }.bind(this));
        });

        it('should emit `startBrowser` event when starting browser', function() {
            this.runner.config.browsers = {
                browser: {browserName: 'name'}
            };

            var spy = this.sinon.spy().named('onStartBrowser');
            this.runner.on('startBrowser', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {browserId: 'browser'});
            });
        });

        it('should emit `beginSuite` event for each suite', function() {
            var spy = this.sinon.spy().named('onBeginSuite');

            this.runner.on('beginSuite', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {
                    browserId: 'browser',
                    suiteName: 'suite'
                });
            });
        });

        it('should call `before` hook with action sequence and find function', function() {
            var stub = this.sinon.stub(this.suite, 'beforeHook'),
                sequence = {
                    stub: true,
                    perform: this.sinon.stub().returns(q.resolve())
                };

            this.browser.createActionSequence.returns(sequence);

            addState(this.suite, 'state');
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(stub, sequence, require('../lib/find-func').find);
            });
        });

        it('should perform before sequence ', function() {
            var sequence = {perform: this.sinon.stub().returns(q())};

            this.browser.createActionSequence.returns(sequence);

            addState(this.suite, 'state');

            return this.runner.run(this.root).then(function() {
                sinon.assert.called(sequence.perform);
            });
        });

        it('should emit `beginState` for each suite state', function() {
            var spy = this.sinon.spy().named('onBeginState');

            addState(this.suite, 'state');
            this.runner.on('beginState', spy);

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {
                    browserId: 'browser',
                    suiteName: 'suite',
                    stateName: 'state'
                });
            });
        });

        it('should not emit `beginState` if state is skipped', function() {
            var spy = this.sinon.spy().named('onBeginState');
            this.suite.addState({
                name: 'state',
                suite: this.suite,
                shouldSkip: this.sinon.stub().returns(true)
            });
            this.runner.on('beginState', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should emit `skipState` if state is skipped', function() {
            var spy = this.sinon.spy().named('onSuiteSkip');
            this.suite.addState({
                name: 'state',
                suite: this.suite,
                shouldSkip: this.sinon.stub().returns(true)
            });
            this.runner.on('skipState', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {
                    browserId: 'browser',
                    suiteName: 'suite',
                    stateName: 'state'
                });
            });
        });

        it('should not emit `skipState` if state is not skipped', function() {
            var spy = this.sinon.spy();
            this.suite.addState({
                name: 'state',
                suite: this.suite,
                callback: function() {},
                shouldSkip: this.sinon.stub().returns(false)
            });
            this.runner.on('skipState', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should not emit state events in second browser when first fails', function() {
            this.runner.config.browsers = {
                browser1: {browserName: 'browser1', version: '1'},
                browser2: {browserName: 'browser2'}
            };

            var spy = this.sinon.spy().named('onBeginState');
            this.runner.on('beginState', spy);
            this.launcher.launch.withArgs('browser1').returns(q.reject(new Error('error')));
            addState(this.suite, 'state');

            return this.runner.run(this.root)
                .then(function() {
                    assert.fail('Promise should not resolve');
                })
                .fail(function() {
                    sinon.assert.neverCalledWith(spy, sinon.match({browserId: 'browser'}));
                });
        });

        it('should launch browser only once', function() {
            addState(this.suite, 'state1');
            addState(this.suite, 'state2');

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledOnce(this.launcher.launch);
            }.bind(this));
        });

        it('should launch browser once even if there is a second suite', function() {
            var secondSuite = createSuite('second', this.root);

            secondSuite.url = '/hello';
            addState(this.suite, 'state');
            addState(secondSuite, 'state');

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledOnce(this.launcher.launch);
            }.bind(this));
        });

        it('should open suite url in browser', function() {
            addState(this.suite, 'state');

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(this.browser.open, 'http://example.com/path');
            }.bind(this));
        });

        it('should emit `endState` for each suite state', function() {
            var spy = this.sinon.spy();

            addState(this.suite, 'state');
            this.runner.on('endState', spy);

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {
                    browserId: 'browser',
                    suiteName: 'suite',
                    stateName: 'state'
                });
            });
        });

        it('should not emit `endState` if state is skipped', function() {
            var spy = this.sinon.spy();
            this.suite.addState({
                name: 'state',
                suite: this.suite,
                shouldSkip: this.sinon.stub().returns(true)
            });
            this.runner.on('endState', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should execute next state only after previous has been finished', function() {
            addState(this.suite, 'state1');
            addState(this.suite, 'state2');

            var endState = this.sinon.spy().named('end state 1'),
                beginState = this.sinon.spy().named('begin state 2');

            this.runner.on('endState', endState);
            this.runner.on('beginState', beginState);

            return this.runner.run(this.root).then(function() {
                sinon.assert.callOrder(
                    endState.withArgs(sinon.match({stateName: 'state1'})),
                    endState.withArgs(sinon.match({stateName: 'state2'}))
                );
            });
        });

        it('should call `after` hook with sequence and find function', function() {
            var stub = this.sinon.stub(this.suite, 'afterHook'),
                sequence = {
                    stub: true,
                    perform: this.sinon.stub().returns(q.resolve())
                };

            this.browser.createActionSequence.returns(sequence);

            addState(this.suite, 'state');
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(stub, sequence, require('../lib/find-func').find);
            });
        });

        it('should emit `endSuite` for each suite', function() {
            var spy = this.sinon.spy().named('endSuite');
            this.runner.on('endSuite', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {
                    browserId: 'browser',
                    suiteName: 'suite'
                });
            });
        });

        it('should also run child suites automatically', function() {
            var spy = this.sinon.spy();

            createSuite('child', this.suite);

            this.runner.on('beginSuite', spy);

            return this.runner.run(this.root).then(function() {
                spy.secondCall.args.must.eql([{
                    browserId: 'browser',
                    suiteName: 'child'
                }]);
            });
        });

        it('should finish parent suite only after all children', function() {
            var spy = this.sinon.spy().named('onEndSuite');

            createSuite('child', this.suite);

            this.runner.on('endSuite', spy);

            return this.runner.run(this.root).then(function() {
                sinon.assert.callOrder(
                    spy.withArgs(sinon.match({suiteName: 'child'})),
                    spy.withArgs(sinon.match({suiteName: 'suite'}))
                );
            });
        });

        it('should execute next suite only after previous has been finished', function() {
            var nextSuite = createSuite('next', this.root),
                endSuite = sinon.spy().named('onEndFirstSuite'),
                beginSuite = sinon.spy().named('onBeginSecondSuite');

            nextSuite.url = '/path2';

            this.runner.on('endSuite', endSuite);
            this.runner.on('beginSuite', beginSuite);

            return this.runner.run(this.root).then(function() {
                sinon.assert.callOrder(
                    endSuite.withArgs(sinon.match({suiteName: 'suite'})),
                    beginSuite.withArgs(sinon.match({suiteName: 'next'}))
                );
            });
        });

        it('should allow to run a suite without url and states', function() {
            var beginSuite = sinon.spy(),
                endSuite = sinon.spy();

            createSuite('suite', this.root);

            this.runner.on('beginSuite', beginSuite);
            this.runner.on('endSuite', endSuite);

            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(beginSuite, sinon.match({suiteName: 'suite'}));
                sinon.assert.calledWith(endSuite, sinon.match({suiteName: 'suite'}));
            });
        });

        it('should emit `stopBrowser` after all suites', function() {
            this.runner.config.browsers = {
                browser: {browserName: 'name'}
            };

            var spy = this.sinon.spy().named('onStartBrowser');
            this.runner.on('stopBrowser', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy, {browserId: 'browser'});
            });
        });

        it('should emit `end` after all suites', function() {
            var spy = this.sinon.spy();
            this.runner.on('end', spy);
            return this.runner.run(this.root).then(function() {
                sinon.assert.calledWith(spy);
            });
        });

        it('should emit events in correct order', function() {
            var begin = this.sinon.spy().named('onBegin'),
                startBrowser = this.sinon.spy().named('onStartBrowser'),
                beginSuite = this.sinon.spy().named('onBeginSuite'),
                beginState = this.sinon.spy().named('onBeginState'),
                endState = this.sinon.spy().named('onEndState'),
                endSuite = this.sinon.spy().named('onEndSuite'),
                stopBrowser = this.sinon.spy().named('onStartBrowser'),
                end = this.sinon.spy().named('onEnd');

            addState(this.suite, 'state');

            this.runner.on('begin', begin);
            this.runner.on('startBrowser', startBrowser);
            this.runner.on('beginSuite', beginSuite);
            this.runner.on('beginState', beginState);
            this.runner.on('endState', endState);
            this.runner.on('endSuite', endSuite);
            this.runner.on('stopBrowser', stopBrowser);
            this.runner.on('end', end);

            return this.runner.run(this.root).then(function() {
                sinon.assert.callOrder(
                    begin,
                    startBrowser,
                    beginSuite,
                    beginState,
                    endState,
                    endSuite,
                    stopBrowser,
                    end
                );
            });
        });
    });
});
