## Gemini Configuration

**Gemini** is configured using `.gemini.yml` file at the root of the project.

**Example**:

```yaml
rootUrl: http://site.example.com
gridUrl: http://selenium-grid.example.com:4444/wd/hub
browsers:
  phantomjs: phantomjs
  chrome: chrome
  opera12:
    browserName: opera
    version: '12.06'
  firefox28:
    browserName: firefox
    version: '28.0'
  firefox27:
    browserName: firefox
    version: '27.0'
```

Some of the options can also be overridden via command-line options or environment variables.
Priorities are the following:

* command-line option has the highest priority. It overrides environment variable
  and config file value.
* environment variable has second priority. It overrides config file value.
* config file value has the lowest priority.
* if no command-line option, environment variable or config file option specified, default is
  used.

Config file options:

* `rootUrl` (CLI: `--root-url`, env: 'GEMINI_ROOT_URL') - the root URL of your website. Target URLs of 
  your test suites will be resolved relatively to it.
* `gridUrl` (CLI: `--grid-url`, env: 'GEMINI_GRID_URL') - Selenium Grid URL to use for taking 
   screenshots. Required, if you want to run test in other browsers then `phantomjs`.
* `browsers` - list of browsers to use for testing. Each browser should be available
on Selenium Grid.

    `browsers` field format:

    ```yaml
    browsers:
      <browser-id>:
        browserName: <name>
        version: <version>
        # ... other browser capabilities as <key>: <value>
    ```

    It is possible to use multiple versions of the same browser (if all versions are
    available on your Selenium Grid instance).

    If version is omitted, any browsers of the specified name will be used.

    `<browser-id>: <name>` is a shortcut for `<browser-id>: {browserName: <name>}`.

    `<browser-id>` value is used for browser indentification in test reports and for
    constructing screens file names.

* `projectRoot` – root directory of a project. All relative paths in config or options
  will be resolved relatively to it. By default it is the directory config file is placed
  in.
* `screenshotsDir` (CLI: `--screenshots-dir`, env: `GEMINI_SCREENSHOTS_DIR`) - directory
  to save reference screenshots to. Specified relatively to config file directory.
  `gemini/screens` by default.
* `capabilities` - additional [Selenium](http://code.google.com/p/selenium/wiki/DesiredCapabilities) and [Sauce Labs](https://saucelabs.com/docs/additional-config) capabilities to use for all browsers:

  ```yaml
  capabilities:
    option1: value,
    option2: value
  ```

  It is possible to set any capability, except `browserName` and `version` (use
  `browsers` option instead) and `takesScreenshot` (always set to `true`
  automatically).

* `debug` (CLI: `--debug`, env: `GEMINI_DEBUG`) - turn on debug logging to the terminal.
* `parallelLimit` - by default, `gemini` will run all browsers in parallel.
  Sometimes (i.e. when using cloud services, such as SauceLabs) you have a
  limit on a number of browser that can be run once at a time. Use this
  option to limit the number of browsers that `gemini` will try to run in
  parallel.
* `strictComparison` - test will be considered as failed in case of any kind of error. By default, only noticeable differences are treated
as test failure.
* `diffColor` - specifies color which will be used to highlight differences
  between images. Specified in hexadecimal RGB (`#RRGGBB`). Magenta by default
  (`#FF00FF`).
* `http.timeout` - Selenium Grid request timeout, msec.
* `http.retries` - Selenium Grid request tries count.
* `http.retryDelay` - delay before retry of Selenium Grid request, msec.
* `coverage` (CLI: `--coverage`, env: `GEMINI_COVERAGE`) - set to `true` to enable experimental
  coverage reporting. Report will be saved to `gemini-coverage` directory.
* `windowSize` (env: `GEMINI_WINDOW_SIZE`) - specify browser window dimensions (i.e. `1600x1200`).