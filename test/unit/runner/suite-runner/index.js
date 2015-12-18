'use strict';

var suiteRunner = require('../../../../lib/runner/suite-runner'),
    RegularSuiteRunner = require('../../../../lib/runner/suite-runner/regular-suite-runner'),
    StatelessSuiteRunner = require('../../../../lib/runner/suite-runner/stateless-suite-runner'),
    SkippedSuiteRunner = require('../../../../lib/runner/suite-runner/skipped-suite-runner'),
    DisabledSuiteRunner = require('../../../../lib/runner/suite-runner/disabled-suite-runner'),
    suiteUtil = require('../../../../lib/suite-util'),
    util = require('../../../util');

describe('runner/suite-runner/create', function() {
    var sandbox = sinon.sandbox.create();

    afterEach(function() {
        sandbox.restore();
    });

    it('should create StatelessSuiteRunner for suite without states', function() {
        var suite = util.makeSuiteStub();

        var runner = suiteRunner.create(suite, {});

        assert.instanceOf(runner, StatelessSuiteRunner);
    });

    it('should create RegularSuiteRunner for suite with states', function() {
        var suite = util.makeSuiteStub({
                states: [util.makeStateStub()]
            });

        var runner = suiteRunner.create(suite, {});

        assert.instanceOf(runner, RegularSuiteRunner);
    });

    it('should create SkippedSuiteRunner for skipped suite', function() {
        var suite = util.makeSuiteStub({
                states: [util.makeStateStub()]
            });
        sandbox.stub(suiteUtil, 'shouldSkip').returns(true);

        var runner = suiteRunner.create(suite, {});

        assert.instanceOf(runner, SkippedSuiteRunner);
    });

    it('should create DisabledSuiteRunner for disabled suite', function() {
        var suite = util.makeSuiteStub();
        sandbox.stub(suiteUtil, 'isDisabled').returns(true);

        var runner = suiteRunner.create(suite, {});

        assert.instanceOf(runner, DisabledSuiteRunner);
    });
});
