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
    return path.join(attachmentStateDir(result.planName, result.stateName),
        result.browserName + '~' + kind + '.png');
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
        plansByName,
        attachmentsQueue;

    tester.on('begin', function() {
        plans = [];
        plansByName = {};
        attachmentsQueue = fs.makeTree(REPORT_ATTACHMENTS);
    });

    tester.on('beginPlan', function(planName) {
        var plan = {
            name: planName,
            states: [],
            statesByName: {}
        };
        plans.push(plan);
        plansByName[planName] = plan;
    });

    tester.on('beginState', function(planName, stateName) {
        var plan = plansByName[planName];

        if (plan.statesByName[stateName]) {
            return;
        }

        var state = {name: stateName, browsers: []};

        plan.states.push(state);
        plan.statesByName[stateName] = state;

        attachmentsQueue.then(function() {
            var dir = path.resolve(REPORT_DIR, attachmentStateDir(plan.name, state.name));
            return fs.makeTree(dir);
        });
    });

    tester.on('endTest', function(result) {
        var plan = plansByName[result.planName],
            state = plan.statesByName[result.stateName];

        result.diffPath = attachmentPath(result, 'diff');
        state.browsers.push(result);

        attachmentsQueue.then(function() {
            var copyCurrent = fs.copy(result.currentPath, attachmentPath(result, 'current'));
            if (result.equal) {
                return copyCurrent;
            }
            return copyCurrent
                .then(function() {
                    return fs.copy(result.referencePath, attachmentPath(result, 'ref'));
                })
                .then(function() {
                    return Image.buildDiff(result.referencePath, result.currentPath,
                                           attachmentPath(result, 'diff'));
                });
        });
    });

    tester.on('end', function () {
        console.log(plans);
        attachmentsQueue
            .then(function() {
                return fs.read(path.resolve(__dirname, './html-tpl.html'));
            })
            .then(function(tpl) {
                var tplFunc = Handlebars.compile(tpl);
                return tplFunc({
                    plans: plans
                });
            })
            .then(function(index) {
                return fs.write(REPORT_INDEX, index);
            })
            .done();
    });
};
