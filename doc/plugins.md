# Writing plugins

Gemini plugin is just an npm package with a `gemini-<plugin name>` name. Module
should export a single function which receives `Gemini` class instance and
user-specified options. For example:

```js
module.exports = function(gemini, options) {
    console.log('Hello from plugin');
};
```

Documentation on the `gemini` object can be found in 
[programmatic API](programmatic-api.md) document.

Options are specified by a user in a config file and passed to the plugin as is.
For example:

.gemini.yml:
```yaml
system:
  plugins:
    greeter:
      name: Mr. Incredible
```

Plugin:
```javascript
module.exports = function(gemini, options) {
    console.log('Hello, %s' options.name);
};

```

When publishing plugins, add `gemini-plugin` keyword to your `package.json` to
help users discovering it.
