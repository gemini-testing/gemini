'use strict';

const ViewModel = require('lib/reporters/html/view-model');
const makeStateResult = require('../../../util').makeStateResult;

describe('ViewModel', () => {
    const sandbox = sinon.sandbox.create();

    const mkViewModel_ = () =>{
        const config = {forBrowser: sandbox.stub().returns({})};
        return new ViewModel(config);
    };

    const getModelResult_ = (model) => model.getResult().suites[0].children[0].browsers[0].result;

    it('should contain "file" in "metaInfo"', () => {
        const model = mkViewModel_();

        model.addSuccess(makeStateResult({
            suite: {file: '/path/file.js'}
        }));

        const metaInfo = JSON.parse(getModelResult_(model).metaInfo);

        assert.equal(metaInfo.file, '/path/file.js');
    });

    it('should contain "url" in "metaInfo"', () => {
        const model = mkViewModel_();

        model.addSuccess(makeStateResult({
            suite: {fullUrl: '/test/url'}
        }));

        const metaInfo = JSON.parse(getModelResult_(model).metaInfo);

        assert.equal(metaInfo.url, '/test/url');
    });

    it('should not modify passed statistic', () => {
        const model = mkViewModel_();
        const stat = {foo: 'bar'};

        model.getResult(stat);

        assert.deepEqual(stat, {foo: 'bar'});
    });
});
