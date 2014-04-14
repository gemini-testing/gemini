'use strict';
var q = require('q'),
    sinon = require('sinon'),
    Plan = require('../lib/plan'),
    State = require('../lib/state'),
    Config = require('../lib/config'),
    Runner = require('../lib/runner'),

    CONFIG_TEXT = [
        'rootUrl: http://example.com',
        'gridUrl: http://grid.example.com',
        'browsers: ',
        '  - browser',
    ].join('\n');

describe('runner', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();

        var browser = {
            open: function () { return q.resolve(); },
            buildElementsMap: function() { return q.resolve(); },
            captureState: function() { return q.resolve(); },
            quit: function() { return q.resolve(); }
        };

        this.browser = browser;
        this.launcher = {
            launch: function() {
                return browser;
            },

            stop: function() {}
        };

        this.plan = new Plan()
            .setName('plan')
            .setUrl('/path');

        this.runner = new Runner(new Config('/root', CONFIG_TEXT), this.launcher);
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('runPlans', function() {
        it('should emit `begin` event when tests start', function() {
            var spy = this.sinon.spy();
            this.runner.on('begin', spy);
            return this.runner.runPlans([]).then(function() {
                sinon.assert.calledOnce(spy);
            });
        });

        it('should emit `beginPlan` event for each plan', function() {
            var spy = this.sinon.spy();

            this.runner.on('beginPlan', spy);
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(spy, 'plan');
            });
        });

        it('should emit `beginState` for each plan state', function() {
            var spy = this.sinon.spy();
            this.plan.capture('state');
            this.runner.on('beginState', spy);

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(spy, 'plan', 'state');
            });

        });

        it('should launch each browser in config', function() {
            this.runner.config.browsers = [
                {name: 'browser1', version: '1'},
                {name: 'browser2'}
            ];

            this.plan.capture('state');

            this.sinon.spy(this.launcher, 'launch');

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(this.launcher.launch, this.runner.config.browsers[0]);
                sinon.assert.calledWith(this.launcher.launch, this.runner.config.browsers[1]);
            }.bind(this));
        });

        it('should launch browser only once for all states', function() {
            this.plan
                .capture('state1')
                .capture('state2');
            this.sinon.spy(this.launcher, 'launch');

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledOnce(this.launcher.launch);
            }.bind(this));
        });

        it('should launch browser second time if there is a `reload()` between states', function() {
            this.plan
                .capture('state1')
                .reload()
                .capture('state2');

            this.sinon.spy(this.launcher, 'launch');

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledTwice(this.launcher.launch);
            }.bind(this));
        });

        it('should open plan url in browser', function() {
            this.plan.capture('state');

            this.sinon.spy(this.browser, 'open');
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(this.browser.open, 'http://example.com/path');
            }.bind(this));
        });

        it('should search for plan elements', function() {
            this.plan
                .setElements({element: '.selector'})
                .setDynamicElements({element2: '.selector'})
                .capture('state');

            this.sinon.spy(this.browser, 'buildElementsMap');
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(this.browser.buildElementsMap,
                    {element: '.selector'},
                    {element2: '.selector'}
                );
            }.bind(this));
        });

        it('should capture state in browser', function() {
            this.plan.capture('state');

            this.sinon.spy(this.browser, 'captureState');

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(this.browser.captureState,
                    sinon.match.instanceOf(State).and(sinon.match.has('name', 'state')));
            }.bind(this));
        });

        it('should pass found elements along with a state', function() {
            var stubElements = {element: 'found'};

            this.plan
                .setElements({element: '.selector'})
                .capture('state');

            this.sinon.stub(this.browser, 'buildElementsMap').returns(q.resolve(stubElements));
            this.sinon.spy(this.browser, 'captureState');
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(this.browser.captureState, sinon.match.any, stubElements);
            }.bind(this));
        });

        it('should emit `endState` for each plan state', function() {
            var spy = this.sinon.spy();
            this.plan.capture('state');
            this.runner.on('endState', spy);

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(spy, 'plan', 'state');
            });
        });

        it('should execute next state only after previous has been finished', function() {
            this.plan
                .capture('state1')
                .capture('state2');

            var endState = this.sinon.spy(),
                beginState = this.sinon.spy();

            this.runner.on('endState', endState);
            this.runner.on('beginState', beginState);

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.callOrder(
                    endState.withArgs('plan', 'state1'),
                    beginState.withArgs('plan', 'state2')
                );
            });
            
        });

        it('should emit `endPlan` for each plan', function() {
            var spy = this.sinon.spy();
            this.runner.on('endPlan', spy);
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(spy, 'plan');
            });
        });

        it('should execute next plan only after previous has been finished', function() {
            var nextPlan = new Plan().setName('nextPlan').setUrl('/path2'),
                endPlan = sinon.spy(),
                beginPlan = sinon.spy();

            this.runner.on('endPlan', endPlan);
            this.runner.on('beginPlan', beginPlan);

            return this.runner.runPlans([this.plan, nextPlan]).then(function() {
                sinon.assert.callOrder(
                    endPlan.withArgs('plan'),
                    beginPlan.withArgs('nextPlan')
                );
            });
        });

        it('should emit `end` after all plans', function() {
            var spy = this.sinon.spy();
            this.runner.on('end', spy);
            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.calledWith(spy);
            });
        });

        it('should emit events in correct order', function() {
            var begin = this.sinon.spy(),
                beginPlan = this.sinon.spy(),
                beginState = this.sinon.spy(),
                endState = this.sinon.spy(),
                endPlan = this.sinon.spy(),
                end = this.sinon.spy();

            this.plan.capture('state');

            this.runner.on('begin', begin);
            this.runner.on('beginPlan', beginPlan);
            this.runner.on('beginState', beginState);
            this.runner.on('endState', endState);
            this.runner.on('endPlan', endPlan);
            this.runner.on('end', end);

            return this.runner.runPlans([this.plan]).then(function() {
                sinon.assert.callOrder(
                    begin,
                    beginPlan,
                    beginState,
                    endState,
                    endPlan,
                    end
                );
            });
        });
    });
});
