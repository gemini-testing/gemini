'use strict';

var inherit = require('inherit'),
    path = require('path'),
    fs = require('fs'),
    url = require('url'),
    q = require('q'),
    chalk = require('chalk'),
    qfs = require('q-io/fs'),
    http = require('q-io/http'),
    css = require('css'),
    minimatch = require('minimatch'),
    coverage = require('gemini-coverage').api,

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
        var _this = this,
            warned = {};
        this.stats.forEach(function(stat) {
            Object.keys(stat).forEach(function(file) {
                var fileStat = stat[file];
                if (fileStat.ignored && !warned[file]) {
                    console.warn(chalk.yellow('WARNING:'), chalk.blue(file), 'may have inaccurate coverage report');
                    console.warn(fileStat.message);
                    warned[file] = true;
                    return;
                }
                var rules = _this.byfile[file] = _this.byfile[file] || {};

                Object.keys(fileStat).forEach(function(rule) {
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
                return q.all(Object.keys(_this.byfile).map(function(file) {
                    return _this.processFile(file);
                }))
                .then(function() {
                    return _this.prepareOutputStats();
                })
                .then(function(data) {
                    return _this.writeStatsJson(data);
                })
                .then(function(data) {
                    if (_this.config.coverageNoHtml) {
                        return;
                    }

                    return coverage.gen({
                        sourceRoot: _this.config.sourceRoot,
                        destDir: path.join(_this.config.projectRoot, 'gemini-coverage')
                    }, {
                        coverage: data
                    });
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
            // Synchronous realpath() is used because of original method is totally synchronous and recursive,
            // while the order of recursive calls is important. Making the code being asynchronous won't make
            // much benefit considering only one async call can be executed to guarantee the calling order.
            src = path.relative(
                this.config.sourceRoot,
                fs.realpathSync(sourceStart.source?
                    path.resolve(opts.docDir, sourceStart.source) :
                    opts.file.replace(this.config.rootUrl, '').replace(/^\//, ''))
            );

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

    fileExcluded: function(path) {
        for (var i = 0; i < this.config.coverageExclude.length; i++) {
            if (minimatch(path, this.config.coverageExclude[i], {matchBase: true})) {
                return true;
            }
        }

        return false;
    },

    writeStatsJson: function(data) {
        return qfs.write(
            path.join(this.covDir, 'coverage.json'),
            JSON.stringify(data, null, 4)
        ).thenResolve(data);
    },

    prepareOutputStats: function() {
        var _this = this,
            stat = {total: 0, covered: 0};

        return {
            files: Object.keys(this.out)
                .filter(function(file) {
                    return !_this.fileExcluded(file);
                })
                .map(function(file) {
                    var covered = 0,
                        blocks = Object.keys(_this.out[file]).map(function(blockKey) {
                            var block = _this.out[file][blockKey];
                            if (block.type === 'covered') {
                                covered++;
                            }
                            return block;
                        });

                    stat.covered += covered;
                    stat.total += blocks.length;

                    return {
                        file: file,
                        blocks: blocks,
                        stat: {
                            total: blocks.length,
                            covered: covered,
                            percent: Math.round(covered / blocks.length * 100)
                        }
                    };
                }),
            total: stat.total,
            covered: stat.covered,
            percent: Math.round(stat.covered / stat.total * 100)
        };
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

function readUrlOrFile(url, file) {
    return http.read({url: url})
        .fail(function(err) {
            return qfs.read(file);
        })
        .then(function(content) {
            return content + '';
        });
}
