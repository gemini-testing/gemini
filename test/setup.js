'use strict';

const chai = require('chai');
const q = require('bluebird-q');

q.longStackSupport = true;

global.sinon = require('sinon');
global.assert = chai.assert;

chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, {prefix: ''});

require('app-module-path').addPath(__dirname + '/../');
