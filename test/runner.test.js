'use strict';
var q = require('q'),
    sinon = require('sinon'),
    createSuite = require('../lib/suite').create,
    State = require('../lib/state'),
    Config = require('../lib/config'),

    CONFIG_TEXT = [
        'rootUrl: http://example.com',
        'gridUrl: http://grid.example.com',
        'browsers: ',
        '  - browser',
    ].join('\n');

function addState(suite, name) {
    var state = new State(suite, name, function() {});
    suite.addState(state);
}

describe('runner', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();

        var browser = {
            fullName: 'browser',
            createActionSequence: this.sinon.stub().returns({
                perform: this.sinon.stub().returns(q.resolve()) 
            }),

            open: this.sinon.stub().returns(q.resolve()),
            buildElementsMap: this.sinon.stub().returns(q.resolve()),
            captureState: this.sinon.stub().returns(q.resolve()),
            quit: this.sinon.stub().returns(q.resolve())
        };

        this.browser = browser;
        this.launcher = {
            launch: function() {
                return browser;
            },

            stop: function() {}
        };

        this.suite = new createSuite('suite');
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
            var spy = this.sinon.spy();
            this.runner.on('begin', spy);
            return this.runner.run([]).then(function() {
                sinon.assert.calledOnce(spy);
            });
        });

        it('should emit `beginSuite` event for each suite', function() {
            var spy = this.sinon.spy();

            this.runner.on('beginSuite', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy, 'suite');
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
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(stub, sequence, require('../lib/find-func').find);
            });
        });

        it('should peroform before sequence ', function() {
            var sequence = { perform: this.sinon.stub().returns(q())};

            this.browser.createActionSequence.returns(sequence);

            addState(this.suite, 'state');

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.called(sequence.perform);
            });
        });


        it('should emit `beginState` for each suite state', function() {
            var spy = this.sinon.spy();

            addState(this.suite, 'state');
            this.runner.on('beginState', spy);

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy, 'suite', 'state', 'browser');
            });

        });

        it('should not emit `beginState` if state is skipped', function() {
            var spy = this.sinon.spy();
            this.suite.addState({
                name: 'state',
                suite: this.suite, 
                shouldSkip: this.sinon.stub().returns(true)
            });
            this.runner.on('beginState', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should emit `skipState` if state is skipped', function() {
            var spy = this.sinon.spy();
            this.suite.addState({
                name: 'state', 
                suite: this.suite,
                shouldSkip: this.sinon.stub().returns(true)
            });
            this.runner.on('skipState', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy, 'suite', 'state', 'browser');
            });
        });

        it('should not emit `skipState` if state is not skipped', function() {
            var spy = this.sinon.spy();
            this.suite.addState({
                name: 'state',
                suite: this.suite,
                shouldSkip: this.sinon.stub().returns(false)
            });
            this.runner.on('skipState', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should launch each browser in config', function() {
            this.runner.config.browsers = [
                {name: 'browser1', version: '1'},
                {name: 'browser2'}
            ];

            addState(this.suite, 'state');

            this.sinon.spy(this.launcher, 'launch');

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(this.launcher.launch, this.runner.config.browsers[0]);
                sinon.assert.calledWith(this.launcher.launch, this.runner.config.browsers[1]);
            }.bind(this));
        });

        it('should launch browser only once for suite', function() {
            addState(this.suite, 'state1');
            addState(this.suite, 'state2');
            this.sinon.spy(this.launcher, 'launch');

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledOnce(this.launcher.launch);
            }.bind(this));
        });

        it('should launch browser second time if there is a second suite', function() {
            var secondSuite = createSuite('second');

            secondSuite.url = '/hello';
            addState(this.suite, 'state');
            addState(secondSuite, 'state');

            this.sinon.spy(this.launcher, 'launch');

            return this.runner.run([this.suite, secondSuite]).then(function() {
                sinon.assert.calledTwice(this.launcher.launch);
            }.bind(this));
        });

        it('should open suite url in browser', function() {
            addState(this.suite, 'state');

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(this.browser.open, 'http://example.com/path');
            }.bind(this));
        });

        it('should capture state in browser', function() {
            addState(this.suite, 'state');

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(this.browser.captureState,
                    sinon.match.instanceOf(State).and(sinon.match.has('name', 'state')));
            }.bind(this));
        });

        it('should emit `endState` for each suite state', function() {
            var spy = this.sinon.spy();

            addState(this.suite, 'state');
            this.runner.on('endState', spy);

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy, 'suite', 'state', 'browser');
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
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.notCalled(spy);
            });
        });

        it('should execute next state only after previous has been finished', function() {
            addState(this.suite, 'state1');
            addState(this.suite, 'state2');

            var endState = this.sinon.spy(),
                beginState = this.sinon.spy();

            this.runner.on('endState', endState);
            this.runner.on('beginState', beginState);

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.callOrder(
                    endState.withArgs('suite', 'state1'),
                    beginState.withArgs('suite', 'state2')
                );
            });
            
        });

        it('should emit `endSuite` for each suite', function() {
            var spy = this.sinon.spy();
            this.runner.on('endSuite', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy, 'suite');
            });
        });

        it('should also run child suites automatically', function() {
            var spy = this.sinon.spy();
            
            createSuite('child', this.suite);

            this.runner.on('beginSuite', spy);

            return this.runner.run([this.suite]).then(function() {
                spy.secondCall.args.must.eql(['child']);
            });
        });

        it('should finish parent suite only after all children', function() {
            var spy = this.sinon.spy();
            
            createSuite('child', this.suite);

            this.runner.on('endSuite', spy);

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.callOrder(
                    spy.withArgs('child'),
                    spy.withArgs('suite')
                );
            });
        });

        it('should execute next suite only after previous has been finished', function() {
            var nextSuite = createSuite('next'),
                endSuite = sinon.spy(),
                beginSuite = sinon.spy();

            nextSuite.url = '/path2';

            this.runner.on('endSuite', endSuite);
            this.runner.on('beginSuite', beginSuite);

            return this.runner.run([this.suite, nextSuite]).then(function() {
                sinon.assert.callOrder(
                    endSuite.withArgs('suite'),
                    beginSuite.withArgs('next')
                );
            });
        });

        it('should allow to run a suite without url and states', function() {
            var beginSuite = sinon.spy(),
                endSuite = sinon.spy(),
                suite = createSuite('suite');

            this.runner.on('beginSuite', beginSuite);
            this.runner.on('endSuite', endSuite);

            return this.runner.run([suite]).then(function() {
                sinon.assert.calledWith(beginSuite, 'suite');
                sinon.assert.calledWith(endSuite, 'suite');
            });
        });

        it('should emit `end` after all suites', function() {
            var spy = this.sinon.spy();
            this.runner.on('end', spy);
            return this.runner.run([this.suite]).then(function() {
                sinon.assert.calledWith(spy);
            });
        });

        it('should emit events in correct order', function() {
            var begin = this.sinon.spy(),
                beginSuite= this.sinon.spy(),
                beginState = this.sinon.spy(),
                endState = this.sinon.spy(),
                endSuite= this.sinon.spy(),
                end = this.sinon.spy();

            addState(this.suite, 'state');

            this.runner.on('begin', begin);
            this.runner.on('beginSuite', beginSuite);
            this.runner.on('beginState', beginState);
            this.runner.on('endState', endState);
            this.runner.on('endSuite', endSuite);
            this.runner.on('end', end);

            return this.runner.run([this.suite]).then(function() {
                sinon.assert.callOrder(
                    begin,
                    beginSuite,
                    beginState,
                    endState,
                    endSuite,
                    end
                );
            });
        });
    });
});
