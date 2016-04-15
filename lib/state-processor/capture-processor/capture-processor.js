'use strict';

module.exports = class CaptureProcessor {
    exec(capture, opts) {
        throw new Error('Not implemented');
    }

    postprocessResult(result) {
        return result;
    }
};
