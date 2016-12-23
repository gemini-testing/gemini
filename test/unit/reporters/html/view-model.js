'use strict';

const _ = require('lodash');

const ViewModel = require('lib/reporters/html/view-model');

describe('ViewModel', () => {
    const sandbox = sinon.sandbox.create();
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
    const getResult_ = (model) => model.getResult().suites[0].children[0].browsers[0].result;
    const createViewModel_ = () =>{
        const config = {forBrowser: sandbox.stub().returns({})};
        return new ViewModel(config);
    };

    it('should contain "file" in "metaInfo"', () => {
        const model = createViewModel_();

        model.addSuccess(stubTest_({
            suite: {file: '/path/file.js'}
        }));

        const metaInfo = JSON.parse(getResult_(model).metaInfo);

        assert.equal(metaInfo.file, '/path/file.js');
    });
});
