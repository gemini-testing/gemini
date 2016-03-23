'use strict';
var _ = require('lodash');
var prefix = 'gemini-';

module.exports = {
    load: function(gemini, options) {
        _.chain(options.system.plugins)
          .pairs()
          .map(function(pair) {
              return {name: pair[0], opts: pair[1]};
          })
          .reject(function(plugin) {
              return plugin.opts === false;
          })
          .map(function(plugin) {
              return {
                  name: _.startsWith(plugin.name, prefix)? plugin.name : prefix + plugin.name,
                  opts: plugin.opts === true? {} : plugin.opts
              };
          })
          .forEach(function(plugin) {
              require(plugin.name)(gemini, plugin.opts);
          }).run();
    }
};
