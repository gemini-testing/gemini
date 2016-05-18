'use strict';

var _ = require('lodash'),
    Handlebars = require('handlebars'),
    q = require('q'),
    fs = require('q-io/fs'),
    path = require('path'),

    ViewModel = require('./view-model'),
    REPORT_DIR = require('./lib').REPORT_DIR,

    makeOutFilePath = _.partial(path.join, REPORT_DIR);

Handlebars.registerHelper('section-status', function() {
    if (this.result && this.result.skipped) {
        return 'section_status_skip';
    }

    if (ViewModel.hasFails(this)) {
        return 'section_status_fail';
    }

    if (ViewModel.hasWarnings(this)) {
        return 'section_status_warning';
    }

    return 'section_status_success';
});

Handlebars.registerHelper('image-box-status', function() {
    var result = this.result;

    if (result.error) {
        return 'image-box_error';
    }

    if (result.warning) {
        return 'image-box_warning';
    }

    return '';
});

Handlebars.registerHelper('has-retries', function() {
    return ViewModel.hasRetries(this)? 'has-retries' : '';
});

Handlebars.registerHelper('has-fails', function() {
    return this.failed > 0? 'summary__key_has-fails' : '';
});

Handlebars.registerHelper('image', function(kind) {
    return new Handlebars.SafeString('<img data-src="' + encodeURI(this[kind + 'Path']) + '">');
});

Handlebars.registerHelper('inc', function(value) {
    return parseInt(value) + 1;
});

function loadTemplate(name) {
    return fs.read(path.join(__dirname, 'templates', name));
}

function copyToReportDir(fileName) {
    return fs.copy(path.join(__dirname, 'static', fileName), makeOutFilePath(fileName));
}

module.exports = {
    /**
     * @param {ViewModelResult} model
     * returns {Promise}
     */
    createHtml: function(model) {
        return q.all([
            loadTemplate('suite.hbs'),
            loadTemplate('state.hbs'),
            loadTemplate('report.hbs')
        ])
         .spread(function(suiteTemplate, stateTemplate, reportTemplate) {
            Handlebars.registerPartial('suite', suiteTemplate);
            Handlebars.registerPartial('state', stateTemplate);

            return Handlebars.compile(reportTemplate)(model);
        });
    },

    /**
     * @param {String} html
     * returns {Promise}
     */
    save: function(html) {
        return fs.makeTree(REPORT_DIR)
            .then(function() {
                return q.all([
                    fs.write(makeOutFilePath('index.html'), html),
                    copyToReportDir('report.js'),
                    copyToReportDir('report.css')
                ]);
            });
    }
};
