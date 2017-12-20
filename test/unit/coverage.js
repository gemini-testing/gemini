'use strict';

const _ = require('lodash');
const path = require('path');
const Coverage = require('lib/coverage');

describe('coverage', () => {
    const sandbox = sinon.sandbox.create();

    const createConfig = (opts) => {
        return _.defaultsDeep(opts || {}, {
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url'
            }),
            system: {projectRoot: 'root/path'}
        });
    };

    beforeEach(() => {
        sandbox.stub(path, 'resolve');
    });

    afterEach(() => sandbox.restore());

    describe('addStatsForBrowser', () => {
        it('should resolve absolute path to a file on the file system', () => {
            const config = createConfig({
                system: {
                    sourceRoot: 'source/root',
                    coverage: {map: () => 'rel/path'}
                }
            });
            const coverage = new Coverage(config);

            coverage.addStatsForBrowser({'http://some/url': {}});

            assert.calledWith(path.resolve, 'source/root', 'rel/path');
        });

        it('should correctly merge a coverage level', () => {
            const config = createConfig();
            const coverage = new Coverage(config);

            coverage.byURL['http://some/url'] = {
                coverage: {'.some-selector': 'full'}
            };
            coverage.addStatsForBrowser({'http://some/url': {'.some-selector': 'none'}});

            assert.deepEqual(coverage.byURL['http://some/url'].coverage, {'.some-selector': 'full'});
        });
    });

    describe('getSourceMap', () => {
        it('parse source map', () => {
            const config = createConfig();
            const coverage = new Coverage(config);

            const ast = {
                stylesheet: {
                    rules: [{
                        type: 'comment',
                        comment: '# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzdHlsZXMuY3NzIiwic291cmNlUm9vdCI6IiJ9'
                    }]
                }
            };

            const map = coverage.getSourceMap(ast, '', '');

            assert.equal(map.file, 'styles.css');
        });

        it('parse webpack source map', () => {
            const config = createConfig();
            const coverage = new Coverage(config);

            const ast = {
                stylesheet: {
                    rules: [{
                        type: 'comment',
                        comment: '# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzdHlsZXMuY3NzIiwic291cmNlUm9vdCI6IiJ9'
                    }]
                }
            };

            const map = coverage.getSourceMap(ast, '', '');

            assert.equal(map.file, 'styles.css');
        });
    });
});
