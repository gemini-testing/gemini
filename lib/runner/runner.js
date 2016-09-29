'use strict';

const PassthroughEmitter = require('../passthrough-emitter');

module.exports = class Runner extends PassthroughEmitter {
    run() {
        throw 'Not implemented';
    }
};

