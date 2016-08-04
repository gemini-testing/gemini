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
    });
});
