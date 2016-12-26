'use strict';

const fs = require('fs'),
    path = require('path'),
    proxyquire = require('proxyquire').noCallThru(),
    _ = require('lodash');

describe('config/config-reader', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(fs, 'readdirSync');
    });

    afterEach(() => {
        sandbox.restore();
    });

    function initReader_(files) {
        fs.readdirSync.returns(_.keys(files));

        files = _.mapKeys(files, (content, filePath) => path.resolve(filePath));

        return proxyquire('lib/config/config-reader', files);
    }

    describe('default config (js|json)', () => {
        const test_ = (fileName) => {
            it('should read ' + fileName, () => {
                const reader = initReader_({[fileName]: {foo: 'bar'}});
                const result = reader.read();
                assert.deepEqual(result, {foo: 'bar'});
            });
        };

        test_('.gemini.conf.js');
        test_('.gemini.js');
        test_('.gemini.conf.json');
        test_('.gemini.json');
    });

    describe('custom config (js|json)', () => {
        const test_ = (fileName) => {
            it('should read ' + fileName, () => {
                const reader = initReader_({[fileName]: {foo: 'bar'}});
                const result = reader.read(fileName);
                assert.deepEqual(result, {foo: 'bar'});
            });
        };
        test_('some-file.js');
        test_('some-file.json');
        test_('some-dir/some-file.js');
        test_('some-dir/some-file.json');
    });
});
