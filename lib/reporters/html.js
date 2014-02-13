'use strict';

var q = require('q'),
    fs = require('q-io/fs'),
    path = require('path'),
    _ = require('lodash');

var REPORT_DIR = 'shooter-report',
    REPORT_INDEX = path.join(REPORT_DIR, 'index.html'),
    REPORT_ATTACHMENTS = path.join(REPORT_DIR, 'attach');

function attachmentsPath(plan) {
    return path.join(REPORT_ATTACHMENTS, plan);
}

function attachmentPath(plan, state, kind) {
    return path.join(attachmentsPath(plan), state + '~' + kind + '.png');
}

module.exports = function htmlReporter(tester) {
    var plans,
        currentPlan,
        attachmentsQueue;

    tester.on('beginTests', function() {
        plans = [];
        attachmentsQueue = fs.makeTree(REPORT_ATTACHMENTS);
    });

    tester.on('beginPlan', function(plan) {
        currentPlan = {name: plan, tests: []};
        plans.push(currentPlan);
        attachmentsQueue.then(function() {
            return fs.makeDirectory(attachmentsPath(plan));
        });
    });

    tester.on('endTest', function(result) {
        currentPlan.tests.push(result);
        attachmentsQueue.then(function() {
            var copyCurrent = fs.copy(result.currentPath, attachmentPath(result.name, result.state, 'current'));
            if (result.equal) {
                return copyCurrent;
            }
            return copyCurrent
                .then(function() {
                    return fs.copy(result.previousPath, attachmentPath(result.name, result.state, 'ref'));
                });
        });
    });

    tester.on('endTests', function () {
        attachmentsQueue
            .then(function() {
                return fs.read(path.resolve(__dirname, './html-tpl.html'));
            })
            .then(function(tpl) {
                var tplFunc = _.template(tpl);
                return tplFunc({
                    plans: plans,
                    attach: function(plan, state, kind) {
                        return encodeURIComponent(path.join('attach', plan, state + '~' + kind + '.png'));
                    }
                });
            })
            .then(function(index) {
                return fs.write(REPORT_INDEX, index);
            })
            .fail(function(error) {
                console.log('err', error);
            });
    });
};
