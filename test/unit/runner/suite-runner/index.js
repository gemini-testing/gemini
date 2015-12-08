'use strict';

var suiteRunner = require('../../../../lib/runner/suite-runner'),
    RegularSuiteRunner = require('../../../../lib/runner/suite-runner/regular-suite-runner'),
    StatelessSuiteRunner = require('../../../../lib/runner/suite-runner/stateless-suite-runner'),
    util = require('../../../util');

describe.only('runner/suite-runner/create', function() {
    it('should create RegularSuiteRunner for suite with states', function() {
        var suite = util.makeSuiteStub({
                states: [util.makeStateStub()]
            });

        var runner = suiteRunner.create(suite);

        assert.instanceOf(runner, RegularSuiteRunner);
    });

    it('should create StatelessSuiteRunner for suite without states', function() {
        var suite = util.makeStateStub();

        var runner = suiteRunner.create(suite);

        assert.instanceOf(runner, StatelessSuiteRunner);
    });
});
