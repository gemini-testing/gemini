# Programmatic API (experimental)

With the help of `gemini/api` module you can use **Gemini** programmatically
in your scripts or build tools plugins.

First step is to create **Gemini** instance with a config:

```javascript
var Gemini = require('gemini/api');

var gemini = new Gemini({
    projectRoot: '/path/to/project',
    gridUrl: 'http://example.com/grid',
    rootUrl: 'http://test.com'
    ...
});
```

* `new Gemini(filePath)` will load config from YAML file at given paths;

* `new Gemini(options)` will create config from specified options (see config
  file reference). Options **must** have `projectRoot` setting specified.

## Accessing the config options

You can get values of options via `gemini.config` property:

```javascript
var Gemini = require('gemini/api'),
    gemini = new Gemini('/path/to/config');

console.log(gemini.config.rootUrl);

```

## Reading the tests

`gemini.readTests(paths, options)` — read all of the tests from specified paths into
one suite collection.

* `paths` is an array of files or directories paths containing Gemini tests.
  If not specified, will look for tests in `$projectRoot/gemini` directory.

Options:

* `grep` — regular expression to filter suites to read. By default, all tests
  will be added to collection. If this option is set, only suites with name matching the
  pattern will be added to collection.

Returns promise which resolves to a `SuiteCollection` object.

Here is the example that prints all top level suite names:

```javascript
var Gemini = require('gemini/api'),
    gemini = new Gemini('/path/to/config');

gemini.readTests()
    .done(function(collection) {
        collection.topLevelSuites().forEach(function(suite) {
            console.log(suite.name);
        });
    });
```

## Suite Collection

You can create SuiteCollection object by using `gemini.SuiteCollection` constructor.
Also SuiteCollection object is returned by `gemini.readTests` method.

SuiteCollection API:

* `SuiteCollection([suites])` — constructor.
  Takes optional `suites` parameter, these are the top level suites.

* `add(suite)` — add suite to collection.

* `topLevelSuites()` — return array of top level suites.

* `allSuites()` — return array of all suites in collection. Goes through all suites
  children recursively.

* `disableAll()` — disable all suites in collection

* `enableAll()` — enable all suites in collection

* `disable(suite, [opts])` — disable suite and all its children

  `suite` can be a real suite object, or suite full name

  `opts` are optional:
    * `opts.browser` — browser to disable suite in
    * `opts.state` — disable only specified state

* `enable(suite, [opts])` — enable suite and all its children. Arguments are the same as in
  `disable`

Example on how to run only certain states in certain browsers:
```js
var collection = gemini.readTests(paths),
    suite = findSomeSuite(collection);

collection
  .disableAll()
  .enable(suite, {state: 'some-state', browser: 'ie9'})
  .enable(suite, {state: 'other-state', browser: 'firefox'});

return gemini.test(collection);
```

### Suite

Suite objects have the following properties:

* `id` — unique numeric identificator of the suite. Automatically generated
  when loading suites.

* `name` — the name of the suite.

* `children` — array of subsuites of the current suite.

* `states` — array of the `State` objects, defined in a suite.

### State

Suite objects have the following properties:

* `name` — the name of the state.

Methods:

* `shouldSkip(browserId)` — returns `true` if this state should be skipped for
  a browser.

## Updating reference screenshots

Use `gemini.update(paths, options)` method.
By default, this command will update reference images that have diff and generate new reference images for new tests.

`paths` is the array of file paths or directories to run the suites from
or `SuiteCollection` instance.

Options:

* `reporters` — array of reporters to use. Each element can be either string
  (to use corresponding built-in reporter) or reporter function (to use
  a custom reporter).

* `grep` — regular expression to filter suites to run. By default, all tests
  will be executed. If this option is set, only suites with name matching the
  pattern will be executed.

* `browsers` — array of browser ids to execute tests in. By default, tests are
  executed in all browsers, specified in config.

* `sets` — array of set names to execute tests in. By default, tests are
  executed for all sets, specified in config.

* `diff`(Boolean) — update only existing images with some diff, states with no reference images will be ignored.

* `new`(Boolean) — generate only missing images.

Returns promise that resolve to a stats object with following keys:

* `total` — total number of tests executed.

* `skipped` — number of skipped tests.

Rejects promise if critical error occurred.

## Running tests

Use `gemini.test(paths, options)` method.

`paths` is the array of file paths or directories to run the tests from
or `SuiteCollection` instance.

Options:

* `reporters` — array of reporter to use. Each element can be either string
  (to use corresponding built-in reporter) or reporter function (to use
  a custom reporter).

* `grep` — regular expression to filter suites to run. By default, all tests
  will be executed. If this option is set, only suites with name matching the
  pattern will be executed.

* `browsers` — array of browser ids to execute tests in. By default, tests are
  executed in all browsers, specified in config.

* `sets` — array of set names to execute tests in. By default, tests are
  executed for all sets, specified in config.

Returns promise that resolve to a stats object with following keys:

* `total` — total number of tests executed.

* `skipped` — number of skipped tests.

* `passed` — number of passed tests.

* `failed` — number of failed tests.

Rejects promise if critical error occurred.

## Utilites

* `gemini.getScreenshotPath(suite, stateName, browserId)` — returns path to
  the reference screenshot of the specified state for specified browser.

* `gemini.getBrowserCapabilites(browserId)` — returns WebDriver capabilities
  for specified `browserId`.

* `gemini.browserIds` — list of all browser identificators to use for tests.

* `Gemini.readRawConfig` — reads configuration file for specified `filePath`
and returns content as JS object. This method does not validate and analyze
gemini configuration.

## Events

`gemini` instance emits some events, which can be used by external scripts or
plugins:

* `START_RUNNER` — emitted before the start of `test` or `update` command. If
  you return a promise from the event handler, the start of the command will
  be delayed until the promise resolves.

* `END_RUNNER` — emitted after the end of the `test` or `update` command.

* `BEFORE_FILE_READ` — emitted before each test file is read. The event is emitted
  with 1 argument `filePath` which is the absolute path to the file to be read.

* `AFTER_FILE_READ` — emitted after each test file have been read. The event is
  emitted with 1 argument `filePath` which is the absolute path to the file that
  was read.

Plugin example with the listening on the events:
```javascript
module.exports = (gemini, options) => {
    gemini.on(gemini.events.START_RUNNER, () => {
        return setUp(gemini.config, options.param); // config can be mutated
    });

    gemini.on(gemini.events.END_RUNNER, () => {
        return tearDown();
    });
};
```
