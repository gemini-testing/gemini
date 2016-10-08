'use strict';

var inherit = require('inherit'),
    _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    url = require('url'),
    Promise = require('bluebird'),
    chalk = require('chalk'),
    qfs = require('q-io/fs'),
    http = require('q-io/http'),
    css = require('css'),
    mm = require('micromatch'),
    coverage = require('gemini-coverage').api,
    coverageLevel = require('./coverage-level'),

    SourceMapConsumer = require('source-map').SourceMapConsumer;

module.exports = inherit({
    __constructor: (config) => {
        this.config = config;
        this.byURL = {};
        this.covDir = path.resolve(this.config.system.projectRoot, 'gemini-coverage');
        this.out = {};
        this._warned = {};
    },

    addStatsForBrowser: (stats, browserId) => {
        _.forEach(stats, (coverage, url) => {
            if (coverage.ignored) {
                this._warnInnacurate(url, coverage.message);
                return;
            }
            const defaultValue = {
                sourceFile: this._urlToFilePath(url, browserId),
                coverage: {}
            };
            this.byURL[url] = this.byURL[url] || defaultValue;
            _.assignWith(this.byURL[url].coverage, coverage, coverageLevel.merge);
        });
    },

    _warnInnacurate: (url, message) => {
        if (this._warned[url]) {
            return;
        }
        console.warn(chalk.yellow('WARNING:'), chalk.blue(url), 'may have inaccurate coverage report');
        console.warn(message);
        this._warned[url] = true;
    },

    _urlToFilePath: (url, browserId) => {
        const config = this.config;
        const rootUrl = config.forBrowser(browserId).rootUrl;
        const relPath = config.system.coverage.map(url, rootUrl);

        return path.resolve(config.system.sourceRoot, relPath);
    },

    processStats: () => {
        const _this = this;

        return qfs.makeDirectory(this.covDir)
            .catch((err) => {
                // ignoring the fail if directory already exists.
                if (err.code !== 'EEXIST') {
                    return Promise.reject(err);
                }
            })
            .then(() =>
                Promise.all(Object.keys(_this.byURL).map((url) => _this.processCSS(url))
                    .then(() => _this.prepareOutputStats())
                    .then((data) => _this.writeStatsJson(data))
                    .then((data) => {
                        if (!_this.config.system.coverage.html) {
                            return;
                        }

                        return coverage.gen({
                            sourceRoot: _this.config.system.sourceRoot,
                            destDir: path.join(_this.config.system.projectRoot, 'gemini-coverage')
                        }, {
                            coverage: data
                        });
                    }))
            );
    },

    processCSS: (url) => {
        const _this = this,
            cssPath = this.byURL[url].sourceFile,
            cssRelPath = path.relative(this.config.system.sourceRoot, cssPath);

        if (this.fileExcluded(cssRelPath)) {
            return;
        }

        return readUrlOrFile(url, cssPath)
            .then((content) => {
                const ast = css.parse(content);
                return Promise.all([
                    ast,
                    content,
                    _this.getSourceMap(ast, cssPath, url)
                ]);
            })
            .spread((ast, fileContent, map) => {
                const ctx = {media: 0},
                    out = _this.out;

                for (let r = 0; r < ast.stylesheet.rules.length; r++) {
                    _this.processRule(
                        ast.stylesheet.rules[r],
                        {
                            url: url,
                            filePath: cssPath,
                            out: out,
                            map: map,
                            docDir: path.dirname(cssPath)
                        },
                        ctx);
                }
            });
    },

    getSourceMap: (ast, cssPath, cssUrl) => {
        const sourceMapUrl = this.findSourceMapPragma(ast);
        if (!sourceMapUrl) {
            return;
        }

        const base64Prefix = 'data:application/json;base64,';
        if (_.includes(sourceMapUrl, base64Prefix)) {
            const base64Str = sourceMapUrl.split(base64Prefix)[1],
                sourceMapStr = new Buffer(base64Str, 'base64').toString('utf8');
            return new SourceMapConsumer(JSON.parse(sourceMapStr));
        }

        return readUrlOrFile(
            url.resolve(cssUrl, sourceMapUrl),
            path.resolve(path.dirname(cssPath), sourceMapUrl)
        )
            .catch((err) => {
                if (err.code !== 'ENOENT') {
                    return Promise.reject(err);
                }
            })
            .then((map) => new SourceMapConsumer(JSON.parse(map)));
    },

    findSourceMapPragma: (ast) => {
        const re = /^#\s*sourceMappingUrl=([^\s]+)/i,
            lastRule = _.last(ast.stylesheet.rules),
            match = lastRule.type === 'comment' && lastRule.comment.match(re);

        return match && decodeURI(match[1]);
    },

    processRule: (rule, opts, ctx) => {
        if (rule.type !== 'rule') {
            if (rule.type === 'media') {
                rule.rules.forEach((childRule) => {
                    opts.group = true;

                    this.processRule(
                        childRule,
                        opts,
                        ctx);
                }, this);

                ctx.media++;
            }

            return;
        }

        let ruleCoverage = _.reduce(rule.selectors, (coverage, selector) => {
            let key = selector;
            if (opts.group) {
                key = '?' + ctx.media + ':' + key;
            }
            return coverageLevel.merge(coverage, this.byURL[opts.url].coverage[key]);
        }, coverageLevel.NONE);

        const sourceStart = getPosition(rule.position.start, opts.url, opts.map),
            sourceEnd = getPosition(rule.position.end, opts.url, opts.map),
            // Synchronous realpath() is used because of original method is totally synchronous and recursive,
            // while the order of recursive calls is important. Making the code being asynchronous won't make
            // much benefit considering only one async call can be executed to guarantee the calling order.
            src = path.relative(
                this.config.system.sourceRoot,
                fs.realpathSync(sourceStart.source ?
                    path.resolve(opts.docDir, sourceStart.source) :
                    opts.filePath)
            ),
            block = this._getSourceBlock(src, sourceStart, sourceEnd);

        block.coverage = coverageLevel.merge(block.coverage, ruleCoverage);
    },

    _getSourceBlock: (source, start, end) => {
        const blocks = this.out[source] = this.out[source] || {},
            key = [start.line, start.column, end.line, end.column].join(':');

        if (!blocks[key]) {
            blocks[key] = {
                start: {
                    line: start.line,
                    column: start.column
                },
                end: {
                    line: end.line,
                    column: end.column
                },
                coverage: coverageLevel.NONE
            };
        }
        return blocks[key];
    },

    fileExcluded: (path) =>
        this.config.system.coverage.exclude.some(
            (excludePattern) => mm.isMatch(path, excludePattern, {matchBase: true})),

    writeStatsJson: (data) =>
        qfs.write(
            path.join(this.covDir, 'coverage.json'),
            JSON.stringify(data, null, 4)
        ).thenReturn(data),

    prepareOutputStats: () => {
        const _this = this,
            stat = {total: 0, covered: 0};

        return {
            files: Object.keys(this.out)
                .filter((file) => !_this.fileExcluded(file))
                .map((file) => {
                    let covered = 0,
                        blocks = Object.keys(_this.out[file]).map((blockKey) => {
                            const block = _this.out[file][blockKey];
                            if (block.coverage === 'full') {
                                covered++;
                            }
                            return {
                                start: block.start,
                                end: block.end,
                                type: coverageToType(block.coverage)
                            };
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
        }

        console.warn(
            'Source map does not provide mapping for %s [%s:%s]. Report might be inaccurate.',
            file,
            originalPos.line,
            originalPos.column);
    }

    // return original parser position if source map is not available or it doesn't provide mapping
    return originalPos;
}

function readUrlOrFile(url, file) {
    return http.read({url: url})
        .catch(() => qfs.read(file))
        .then((content) => content + '');
}

function coverageToType(coverage) {
    switch (coverage) {
        case coverageLevel.FULL:
            return 'covered';
        case coverageLevel.PARTIAL:
            return 'partial';
        case coverageLevel.NONE:
            return 'none';
        default:
            return undefined;
    }
}
