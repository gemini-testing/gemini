'use strict';

const _ = require('lodash');
const {keys} = require('gemini-core');

//real methods will be populated at run time by ./test-api module
exports.suite = function() {};

//keys constants
_.extend(exports, keys);
