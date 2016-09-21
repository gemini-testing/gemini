'use strict';

const _ = require('lodash');

const PREFIX = 'gemini-';

module.exports = {
    load: (gemini) => {
        _(gemini.config.system.plugins)
          .map((opts, name) => ({name, opts}))
          .reject((plugin) => plugin.opts === false)
          .map((plugin) => {
              return {
                  name: _.startsWith(plugin.name, PREFIX) ? plugin.name : PREFIX + plugin.name,
                  opts: plugin.opts === true ? {} : plugin.opts
              };
          })
          .forEach((plugin) => require(plugin.name)(gemini, plugin.opts));
    }
};
