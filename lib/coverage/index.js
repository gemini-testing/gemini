'use strict';

var inherit = require('inherit'),
    path = require('path'),
    url = require('url'),
    q = require('q'),
    qfs = require('q-io/fs'),
    http = require('q-io/http'),
    css = require('css'),
    hb = require('handlebars'),
    minimatch = require('minimatch'),

    SourceMapConsumer = require('source-map').SourceMapConsumer;

module.exports = inherit({
    __constructor: function(config) {
        this.config = config;
        this.stats = [];
        this.byfile = {};
        this.covDir = path.resolve(this.config.projectRoot, 'gemini-coverage');
        this.out = {};
    },

    addStats: function(stats) {
        this.stats.push(stats);
    },

    processStats: function() {
        var _this = this;
        this.stats.forEach(function(stat) {
            Object.keys(stat).forEach(function(file) {
                var rules = _this.byfile[file] = _this.byfile[file] || {};

                Object.keys(stat[file]).forEach(function(rule) {
                    if (!rules[rule]) {
                        rules[rule] = stat[file][rule];
                    }
                });
            });
        });

        return qfs.makeDirectory(this.covDir)
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
                return q.all(Object.keys(_this.byfile).map(function(file) {
                    return _this.processFile(file);
                }))
                .then(function() {
                    return _this.makeReports(tmpl);
                })
                .then(function(reports) {
                    return prepareOutputStats(reports);
                })
                .then(function(stats) {
                    return q.all([
                        writeIndex(stats, _this.covDir),
                        writeStatsJson(stats, _this.covDir),
                        copyResources(_this.covDir)
                    ]);
                });
            });
    },

    processFile: function(file, tmpl) {
        var _this = this,
            cssRelPath = file.replace(this.config.rootUrl, '').replace(/^\//, ''),
            cssPath = path.resolve(this.config.sourceRoot, cssRelPath);

        if (this.fileExcluded(cssRelPath)) {
            return;
        }

        return http.read({url: file})
            .then(function(content) {
                var ast = css.parse(content += '');
                return q.all([
                    ast,
                    content,
                    _this.getSourceMap(ast, cssPath, file)
                ]);
            })
            .spread(function(ast, fileContent, map) {
                fileContent += '';
                var lines = fileContent.split(/\r?\n/g),
                    ctx = {media: 0},
                    out = _this.out;

                for (var r = 0; r < ast.stylesheet.rules.length; r++) {
                    _this.processRule(
                        ast.stylesheet.rules[r],
                        {
                            lines: lines,
                            file: file,
                            out: out,
                            map: map,
                            docDir: path.dirname(cssPath)
                        },
                        ctx);
                }
            });
    },

    getSourceMap: function(ast, cssPath, cssUrl) {
        var sourceMapUrl = this.findSourceMapPragma(ast);

        if (sourceMapUrl) {
            return readUrlOrFile(
                    url.resolve(cssUrl, sourceMapUrl),
                    path.resolve(path.dirname(cssPath), sourceMapUrl)
                )
                .fail(function(err) {
                    if (err.code !== 'ENOENT') {
                        return q.reject(err);
                    }
                })
                .then(function(map) {
                    return new SourceMapConsumer(JSON.parse(map));
                });
        }
    },

    findSourceMapPragma: function(ast) {
        var re = /^#\s*sourceMappingUrl=([^\s]+)/i;

        for (var r = 0; r < ast.stylesheet.rules.length; r++) {
            var rule = ast.stylesheet.rules[r];
            if (rule.type !== 'comment') {
                continue;
            }

            var match = rule.comment.match(re);
            if (match) {
                return decodeURI(match[1]);
            }
        }
    },

    processRule: function(rule, opts, ctx) {
        if (rule.type !== 'rule') {
            if (rule.type === 'media') {
                rule.rules.forEach(function(childRule) {
                    this.processRule(
                        childRule,
                        {
                            lines: opts.lines,
                            file: opts.file,
                            out: opts.out,
                            group: true,
                            map: opts.map,
                            docDir: opts.docDir
                        },
                        ctx);
                }, this);

                ctx.media++;
            }

            return;
        }

        var cls = 'none';
        for (var sel = 0; sel < rule.selectors.length; sel++) {
            var key = rule.selectors[sel];
            if (opts.group) {
                key = '?' + ctx.media + ':' + key;
            }

            var selector = this.byfile[opts.file][key];
            if (selector) {
                cls = 'partial';
                if (selector.within) {
                    cls = 'covered';
                }
                break;
            }
        }

        var sourceStart = getPosition(rule.position.start, opts.file, opts.map),
            sourceEnd = getPosition(rule.position.end, opts.file, opts.map),
            src = sourceStart.source?
                path.relative(this.config.sourceRoot, path.resolve(opts.docDir, sourceStart.source)) :
                opts.file.replace(this.config.rootUrl, '').replace(/^\//, '');

        var blocks = (opts.out[src] = opts.out[src] || {}),
            posKey = sourceStart.line + ':' + sourceStart.column + ':' + sourceEnd.line + ':' + sourceEnd.column,
            block = blocks[posKey];

        if (block) {
            var types = {
                'none': 0,
                'partial': 1,
                'covered': 2
            };

            if (types[cls] > types[block.type]) {
                block.type = cls;
            }
        } else {
            blocks[posKey] = {
                start: {
                    line: sourceStart.line,
                    column: sourceStart.column
                },
                end: {
                    line: sourceEnd.line,
                    column: sourceEnd.column
                },
                type: cls
            };
        }
    },

    makeReports: function(tmpl) {
        var _this = this,
            reports = [];

        return q.all(Object.keys(this.out).map(function(src) {
            if (_this.fileExcluded(src)) {
                return;
            }

            var reportFile = src.replace(/\//g, '_') + '.html',
                reportPath = path.join(_this.covDir, reportFile);

            return _this.makeReport(
                {
                    file: path.resolve(_this.config.sourceRoot, src),
                    url: url.resolve(_this.config.rootUrl, src)
                },
                reportPath,
                {
                    data: _this.out[src],
                    tmpl: tmpl
                })
                .then(function(rulesStat) {
                    reports.push({
                        source: src,
                        report: reportFile,
                        stat: rulesStat
                    });
                });
        }))
        .thenResolve(reports);
    },

    makeReport: function(source, dest, opts) {
        var _this = this,
            data = Object.keys(opts.data).map(function(key) {
                return opts.data[key];
            }),
            url = source.url,
            file = source.file,
            coveredCount = 0,
            stat;

        return readUrlOrFile(url, file)
            .then(function(content) {
                var lines = content.toString().replace(/\\r\\n/g, '\n').split('\n');
                // cover into <pre> blocks css lines having some coverage state
                for (var b = data.length - 1; b >= 0; b--) {
                    var block = data[b];

                    for (var l = block.start.line - 1; l < block.end.line; l++) {
                        lines[l] = '<pre class="' + block.type + '">' + htmlEscape(lines[l]) + ' </pre>';
                    }

                    if (block.type === 'covered') {
                        coveredCount++;
                    }
                }

                var re = /^<\/?pre/;
                // cover into <pre> blocks everything not covered in the state above
                for (b = 0; b < lines.length; b++) {
                    if (!lines[b].match(re)) {
                        lines[b] = '<pre>' + htmlEscape(lines[b]) + ' </pre>';
                    }
                }

                var percent = Math.round(coveredCount / data.length * 100);
                stat = {
                    total: data.length,
                    covered: coveredCount,
                    percent: percent,
                    level: 'bad'
                };

                if (percent === 100) {
                    stat.level = 'perfect';
                } else if (percent >= 50) {
                    stat.level = 'good';
                }

                return hb.compile(opts.tmpl)({
                    content: lines.join('\n'),
                    source: path.relative(path.dirname(dest), file),
                    projectSource: path.relative(_this.config.sourceRoot, file),
                    url: url,
                    stat: stat
                });
            })
            .then(function(output) {
                return qfs.write(dest, output);
            })
            .then(function() {
                return stat;
            });
    },

    fileExcluded: function(path) {
        for (var i = 0; i < this.config.coverageExclude.length; i++) {
            if (minimatch(path, this.config.coverageExclude[i], {matchBase: true})) {
                return true;
            }
        }

        return false;
    }
});

function getPosition(originalPos, file, map) {
    // amend rule position via source map if available
    if (map) {
        map = map.originalPositionFor({
            line: originalPos.line,
            column: originalPos.column
        });

        if (map.source) {
            return map;
        } else {
            console.warn(
                'Source map does not provide mapping for %s [%s:%s]. Report might be inaccurate.',
                file,
                originalPos.line,
                originalPos.column);
        }
    }

    // return original parser position if source map is not available or it doesn't provide mapping
    return originalPos;
}

function prepareOutputStats(reports) {
    reports.sort(function(a, b) {
        return a.source.localeCompare(b.source);
    });

    var stat = reports.reduce(
        function(prev, current) {
            prev.covered += current.stat.covered;
            prev.total += current.stat.total;

            return prev;
        },
        {total: 0, covered: 0}
    );

    return q.resolve({
        reports: reports,
        covered: stat.covered,
        total: stat.total,
        percent: Math.round(stat.covered / stat.total * 100)
    });
}

function writeIndex(stats, covDir) {
    return qfs.read(path.join(__dirname, 'coverage-index.hbs'))
        .then(function(tmpl) {
            return qfs.write(
                path.join(covDir, 'index.html'),
                hb.compile(tmpl)(stats));
        });
}

function writeStatsJson(stats, covDir) {
    return qfs.write(
        path.join(covDir, 'coverage.json'),
        JSON.stringify(
        {
            files: stats.reports,
            total: stats.total,
            covered: stats.covered,
            percent: stats.percent
        }, null, 4));
}

function copyResources(covDir) {
    var res = [
        'coverage.css',
        'tinytable.sorter.js'
    ];

    return q.all(res.map(function(r) {
        return qfs.copy(path.resolve(__dirname, r), path.join(covDir, r));
    }));
}

function readUrlOrFile(url, file) {
    return http.read({url: url})
        .fail(function(err) {
            return qfs.read(file);
        })
        .then(function(content) {
            return content + '';
        });
}

function htmlEscape(s) {
    if (!s) {
        return '';
    }

    var escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
    };

    return s.replace(
        /[&<>"'`]/g,
        function(c) {
            return escape[c] || c;
        }
    );
}
