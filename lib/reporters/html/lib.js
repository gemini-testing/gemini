'use strict';

var _  = require('lodash'),
    path = require('path');

module.exports = function(reportRoot) {
    var referencePath = _.partial(createPath, 'ref'),
    currentPath = _.partial(createPath, 'current'),
    diffPath = _.partial(createPath, 'diff'),

    absolutePath = _.partial(path.resolve, reportRoot);

    /**
     * @param {String} kind - одно из значение 'ref', 'current', 'diff'
     * @param {StateResult} result
     * @returns {String}
     */
    function createPath(kind, result) {
        var components = [].concat('images', result.suite.path, result.state.name, result.browserId + '~' + kind + '.png');
        return path.join.apply(null, components);
    }

    return {
        REPORT_DIR: reportRoot,

        referencePath: referencePath,
        currentPath: currentPath,
        diffPath: diffPath,

        referenceAbsolutePath: _.compose(absolutePath, referencePath),
        currentAbsolutePath: _.compose(absolutePath, currentPath),
        diffAbsolutePath: _.compose(absolutePath, diffPath)
    };
};
