'use strict';
var EventEmitter = require('events').EventEmitter,

    q = require('q'),
    inherit = require('inherit'),
    promiseUtils = require('./promise-util');

module.exports = inherit(EventEmitter, {

    __constructor: function(config) {
        this.config = config;
    },

    _beforeAll: function() {
        return q.resolve();
    },

    _afterAll: function() {
        return q.resolve();
    },

    runPlans: function(plans) {
        var _this = this;
        return this._beforeAll()
            .then(function() {
                return promiseUtils.seqMap(plans, _this.runPlan.bind(_this));
            })
            .then(this._afterAll.bind(this));
    },

    runPlan: function(plan) {
        var states = plan.getStates(),
            runState = this._runState.bind(this, plan);
        return this._beforePlan(plan)
            .then(function() {
                return promiseUtils.seqMap(states, runState);
            })
            .then(this._afterPlan.bind(this, plan));
    },

    _beforePlan: function(plan) {
        return q.resolve();
    },

    _afterPlan: function(plan) {
        return q.resolve();
    },

    _runState: function(plan, state) {
        return q.resolve();
    }
});
