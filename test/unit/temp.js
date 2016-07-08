'use strict';

var requireWithNoCache = require('lib/utils').requireWithNoCache,
    nodeTemp = require('temp');

describe('temp', function() {
    var sandbox = sinon.sandbox.create(),
        temp;

    beforeEach(function() {
        sandbox.stub(nodeTemp);
        temp = requireWithNoCache(require.resolve('lib/temp'));
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should enable auto clean', function() {
        assert.calledOnce(nodeTemp.track);
    });

    describe('init', function() {
        it('should create gemini temp dir in system temp dir by default', function() {
            temp.init();

            assert.calledWithMatch(nodeTemp.mkdirSync, {
                dir: sinon.match.falsy,
                prefix: '.gemini.tmp.'
            });
        });

        it('should create gemini temp dir in passed dir', function() {
            temp.init('./');

            assert.calledWith(nodeTemp.mkdirSync, {
                dir: process.cwd(),
                prefix: '.gemini.tmp.'
            });
        });

        it('should create gemini temp dir in passed absolute path', function() {
            temp.init('/some/dir');

            assert.calledWithMatch(nodeTemp.mkdirSync, {
                dir: '/some/dir'
            });
        });
    });

    describe('path', function() {
        it('should passthrough options extending them with temp dir', function() {
            nodeTemp.mkdirSync.returns('/some/temp/dir');
            temp.init();

            temp.path({prefix: 'prefix.', suffix: '.suffix'});

            assert.calledWith(nodeTemp.path, {
                dir: '/some/temp/dir',
                prefix: 'prefix.',
                suffix: '.suffix'
            });
        });
    });
});
