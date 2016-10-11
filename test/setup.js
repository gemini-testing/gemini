'use strict';

const chai = require('chai');
const Promise = require('bluebird');

Promise.config({
    longStackTraces: true
});

Promise.promisifyAll(require('fs-extra'));

global.sinon = require('sinon');
global.assert = chai.assert;

chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, {prefix: ''});

require('app-module-path').addPath(__dirname + '/../');
