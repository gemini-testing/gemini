'use strict';

var inherit = require('inherit'),
    path = require('path'),
    url = require('url'),
    q = require('q'),
    qfs = require('q-io/fs'),
    http = require('q-io/http'),
    css = require('css'),
    hb = require('handlebars');

module.exports = inherit({
    __constructor: function(config) {
        this.config = config;
        this.stats = [];
    },

    addStats: function(stats) {
        this.stats.push(stats);
    },

    processStats: function() {
        var byfile = {};
        this.stats.forEach(function(stat) {
            Object.keys(stat).forEach(function(file) {
                var rules = byfile[file] = byfile[file] || {};

                Object.keys(stat[file]).forEach(function(rule) {
                    if (!rules[rule]) {
                        rules[rule] = stat[file][rule];
                    }
                });
            });
        });

        return qfs.makeDirectory('gemini-coverage')
            .fail(function(err) {
                // ignoring the fail if directory already exists.
                if (err.code !== 'EEXIST') {
                    return q.reject(err);
                }
            })
            .then(function() {
                return qfs.read(path.join(__dirname, 'coverage.hbs'));
            })
            .then(function(tmpl) {
                return q.all(Object.keys(byfile).map(function(file) {
                    return http.read({url: file})
                        .then(function(fileContent) {
                            fileContent += '';
                            var line = 0,
                                lines = fileContent.replace(/\\r\\n/g, '\n').split('\n'),
                                ast = css.parse(fileContent),
                                ctx = {
                                    media: 0
                                },
                                out = [];

                            for (var r = 0; r < ast.stylesheet.rules.length; r++) {
                                line = processRule(
                                    ast.stylesheet.rules[r],
                                    {
                                        line: line,
                                        lines: lines,
                                        byfile: byfile,
                                        file: file,
                                        out: out
                                    },
                                    ctx);
                            }

                            return qfs.write(
                                path.join('gemini-coverage', url.parse(file).pathname.replace(/\//g, '_') + '.html'),
                                hb.compile(tmpl)({blocks: out}));
                        });
                }));
            });
    }
});

function processRule(rule, opts, ctx) {
    var line = opts.line;
    if (rule.type !== 'rule') {
        if (rule.type === 'media') {
            rule.rules.forEach(function(childRule) {
                line = processRule(
                    childRule,
                    {
                        line: line,
                        lines: opts.lines,
                        byfile: opts.byfile,
                        file: opts.file,
                        out: opts.out,
                        group: true
                    },
                    ctx);
            });

            ctx.media++;
        }

        if (line < rule.position.end.line) {
            line = pushLines(line, rule.position.end.line, opts);
        }

        return line;
    }

    line = pushLines(line, rule.position.start.line - 1, opts);

    var cls = 'none';
    for (var sel = 0; sel < rule.selectors.length; sel++) {
        var key = rule.selectors[sel];
        if (opts.group) {
            key = '?' + ctx.media + ':' + key;
        }

        var selector = opts.byfile[opts.file][key];
        if (selector) {
            cls = 'partial';
            if (selector.within) {
                cls = 'covered';
            }
            break;
        }
    }

    line = pushLines(line, rule.position.end.line, opts);
    opts.out[opts.out.length - 1].type = cls;

    return line;
}

function pushLines(line, till, opts) {
    var data = [];
    for (var l = line; l < till; l++, line = l) {
        data.push(opts.lines[l]);
    }

    opts.out.push(
        {
            type: 'normal',
            content: data.join('\n')
        }
    );

    return line;
}
