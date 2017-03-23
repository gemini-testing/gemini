'use strict';

const _ = require('lodash');
const ViewModel = require('lib/reporters/html/view-model');
const TestCounter = require('lib/test-counter');

describe('ViewModel', () => {
    const sandbox = sinon.sandbox.create();

    const mkViewModel_ = () =>{
        const config = {forBrowser: sandbox.stub().returns({})};
        return new ViewModel(config);
    };

    const getModelResult_ = (model) => model.getResult().suites[0].children[0].browsers[0].result;

    const stubTest_ = (opts) => {
        opts = opts || {};

        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            suite: {
                path: ['suite'],
                metaInfo: {sessionId: 'sessionId-default'},
                file: 'default/path/file.js'
            }
        });
    };

    it('should contain "file" in "metaInfo"', () => {
        const model = mkViewModel_();

        model.addSuccess(stubTest_({
            suite: {file: '/path/file.js'}
        }), {failedOnly: false});

        const metaInfo = JSON.parse(getModelResult_(model).metaInfo);

        assert.equal(metaInfo.file, '/path/file.js');
    });

    it('should contain "url" in "metaInfo"', () => {
        const model = mkViewModel_();

        model.addSuccess(stubTest_({
            suite: {fullUrl: '/test/url'}
        }), {failedOnly: false});

        const metaInfo = JSON.parse(getModelResult_(model).metaInfo);

        assert.equal(metaInfo.url, '/test/url');
    });

    it('should not prepare "metaInfo", when "failedOnly" is true', () => {
        const model = mkViewModel_();

        model.addSuccess(stubTest_({
            suite: {
                file: '/path/file.js',
                fullUrl: '/test/url'
            }
        }), {failedOnly: true});

        assert.isUndefined(model.getResult().suites);
    });

    it('should incrase the passed counter, when "failedOnly" is true', () => {
        const model = mkViewModel_();
        sandbox.stub(model._counter, 'onPassed');

        model.addSuccess(stubTest_({}), {failedOnly: true});

        assert.calledOnce(model._counter.onPassed);
    })
});
