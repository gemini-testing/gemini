'use strict';

var fs = require('q-io/fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    Image = require('../image');

var REPORT_DIR = 'shooter-report',
    REPORT_INDEX = path.join(REPORT_DIR, 'index.html'),
    REPORT_ATTACHMENTS = path.join(REPORT_DIR, 'attach');

function attachmentStateDir(planName, stateName) {
    return path.join('attach', planName, stateName);
}

function attachmentPath(result, kind) {
    return path.resolve(REPORT_DIR, attachmentRelPath(result, kind));
}

// Path to attachments relative to root report
function attachmentRelPath(result, kind) {
    return path.join(attachmentStateDir(result.plan, result.state), result.browser + '~' + kind + '.png');
}

Handlebars.registerHelper('status', function() {
    return this.equal? 'success' : 'fail';
});

Handlebars.registerHelper('image', function(kind) {
    return new Handlebars.SafeString(
            '<img src="' +
            encodeURIComponent(attachmentRelPath(this, kind)) +
            '">');
});

module.exports = function htmlReporter(tester) {
    var plans,
        currentPlan,
        currentState,
        attachmentsQueue;

    tester.on('begin', function() {
        plans = [];
        attachmentsQueue = fs.makeTree(REPORT_ATTACHMENTS);
    });

    tester.on('beginPlan', function(plan) {
        currentPlan = {name: plan, states: []};
        plans.push(currentPlan);
    });

    tester.on('beginState', function(plan, state) {
        currentState = {name: state, browsers: []};
        currentPlan.states.push(currentState);
        attachmentsQueue.then(function() {
            var dir = path.resolve(REPORT_DIR, attachmentStateDir(currentPlan.name, currentState.name));
            return fs.makeTree(dir);
        });
    });

    tester.on('endTest', function(result) {
        result.diffPath = attachmentPath(result, 'diff');
        currentState.browsers.push(result);

        attachmentsQueue.then(function() {
            var copyCurrent = fs.copy(result.currentPath, attachmentPath(result, 'current'));
            if (result.equal) {
                return copyCurrent;
            }
            return copyCurrent
                .then(function() {
                    return fs.copy(result.previousPath, attachmentPath(result, 'ref'));
                })
                .then(function() {
                    return Image.buildDiff(result.previousPath, result.currentPath,
                                           attachmentPath(result, 'diff'));
                })
                .done();
        });
    });

    tester.on('end', function () {
        attachmentsQueue
            .then(function() {
                return fs.read(path.resolve(__dirname, './html-tpl.html'));
            })
            .then(function(tpl) {
                var tplFunc = Handlebars.compile(tpl);
                return tplFunc({
                    plans: plans
                    //attach: function(result, kind) {
                        //return encodeURIComponent(attachmentRelPath(result, kind));
                    //}
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
