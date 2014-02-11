'use strict';

var DEFAULT_CFG_NAME = '.shooter.yml';

exports.testFile = function() {
    this.arg()
        .name('testFile')
        .title('Test file')
        .end();
};

exports.configFile = function() {
    this.opt()
        .name('configFile')
        .long('config').short('c')
        .title('Config file')
        .def(DEFAULT_CFG_NAME)
        .end();
};
