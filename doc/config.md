# Gemini configuration

**Gemini** is configured using `.gemini.yml` file at the root of the project.

Complete example with all available settings looks like this, but you'll need
to specify only a few settings specific for your project:

```yaml
rootUrl: https://example.com/root
gridUrl: http://webdriber.example.com
desiredCapabilities:
  commonThing: value
calibrate: false
tolerance: 3.5
httpTimeout: 5000
sessionRequestTimeout: 60000
sessionQuitTimeout: 5000
screenshotsDir: './screens'
windowSize: 1600x1080
sessionsPerBrowser: 2
suitesPerSession: 100

browsers:
  chrome-latest:
    desiredCapabilities:
      version: "37.0"
      browserName: chrome
      platform: LINUX

  firefox-latest:
    rootUrl: https://example.com/special-for-ff
    screenshotsDir: './ff-screens'
    calibrate: true
    desiredCapabilities:
      version: "31.0"
      browserName: firefox
      platform: LINUX

sets:
  ff:
    files:
     - gemini/ff
    browsers:
     - firefox-latest
  chrome:
    files:
     - gemini/chrome
    browsers:
     - chrome-latest

system:
  projectRoot: ../project
  sourceRoot: ../project/src
  exclude:
    - node_modules/**
  plugins:
    teamcity: true
  debug: true
  parallelLimit: 3
  diffColor: '#ff0000'
  coverage:
    enabled: true
    exclude:
     - libs/**
     - "*.blocks/**/*.tests/blocks/**"
     - "*.blocks/**/*.tests/*.blocks/**"
    html: false
```

## System settings

There is a `system` section in the config file, which contains global `gemini`
settings. These settings can not be set per-browser.

* `projectRoot` – root directory of a project. All relative paths in config or
  options will be resolved relatively to it. By default it is the directory
  config file is placed in.

* `sourceRoot` – directory which contains the source files.  Local sources
  will be used in the coverage report when the source map is available, but
  the sources can not be downloaded via URLs from the test pages. By default,
  it is equal to `projectRoot`.

* `tempDir` – directory to save temporary images (current states) to. This
  directory should exist. Gemini will create own temp directory in it with name
  starting with `.gemini.tmp.` where all temporary images will be saved.
  After run created directory will be removed. If not set system temp
  directory will be used.

* `exclude` - array of glob patterns to exclude paths from the test search. For example:

```yaml
exclude:
  - node_modules/**
  - gemini/helpers/**
  - foo/{bar,baz}/*.js
```

* `plugins` - list of plugins to enable. Should have form of `pluginName:
  settings`.  For example:

  ```yaml
  plugins:
    teamcity: true
    saucelabs:
      username: user
      password: pass
  ```

  Each plugin should be an installed npm package named `gemini-<pluginName>`.

* `debug` – turn on debug logging to the terminal.

* `parallelLimit` – by default, `gemini` will run all browsers simultaneously.
  Sometimes (i.e. when using cloud services, such as SauceLabs) you have
  a limit of a number of browser that can be run once at a time. Use this
  option to limit the number of browsers that `gemini` will try to run in
  parallel.

* `diffColor` – specifies color which will be used to highlight differences
  between images. Specified in hexadecimal RGB (`#RRGGBB`). Magenta by default
  (`#FF00FF`).

* `coverage` - `gemini` can gather and report CSS tests coverage. It supports
  source maps, so you can get the report even if you are using preprocessor or
  minifier. The JSON and html reports are saved to `gemini-coverage`
  directory. There are many settings under this section:

  - `enabled` – set to `true` to enable coverage reporting.

  - `map` - function which can be used for overriding default logic of source root path resolving.
  By default it returns path to CSS file relative to the source root.
  This function accepts 2 arguments:
    * `url` - full url of source file which coverage should be obtained
    * `rootUrl` - root url specified in the config for current browser

  - `exclude` – array of file paths or glob patterns to exclude from coverage
    report. For example:

      ```yaml
      system:
        coverage:
          exclude:
            - libs/**
            - path/to/some.css
      ```

  - `html` - set to false to disable html report and save only JSON.

## Browsers settings

These settings specify the configuration of each browser used for tests. Each
setting can be specified in two ways:

1. At the top level of a config file. This way it affects all browsers.
2. Inside the `browsers` section. This way it will affect only one browser and
   override top level value.

Format of the browsers section:

  ```yaml
  browsers:
    <browser-id>:
      <setting>: <value>
      <setting>: <value>
  ```

`<browser-id>` value is used for browser identification in test reports and
for constructing screens file names.

Settings list:

* `rootUrl` (required) – the root URL of your website. Target URLs of your
  test suites will be resolved relatively to it. If top level `rootUrl` value is set
  and browser `rootUrl` - is relative url, then resolved `rootUrl` will be result of
  concatenation of top level `rootUrl` and individual browser `rootUrl`.

* `desiredCapabilities` (required) - WebDriver
  [DesiredCapabilites](https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities)
  for the browser. Per-browser value will be merged with top-level value
  instead of overriding it.

* `gridUrl` – WebDriver URL to use for taking screenshots. By default is
  http://localhost:4444/wd/hub

* `calibrate` - does this browser need to perform the calibration procedure.
  This procedure allows to correctly capture the image in case the particular
  WebDriver implementation captures browser UI along with web page. Enabled by
  default. If you are sure this is not the case for your WebDriver, you can
  disable it by setting this option to `false`.

* `httpTimeout` - timeout for HTTP requests to WebDriver, milliseconds. By
  default the server timeout is used.

* `sessionRequestTimeout` - timeout for getting of browser sessions, milliseconds. By default the value of option `httpTimeout` is used.

* `sessionQuitTimeout` - timeout for closing browser sessions, milliseconds. By default the value of option `httpTimeout` is used.

* `screenshotsDir` – directory to save reference screenshots to.
  `<projectRoot>/gemini/screens` by default.

* `tolerance` - indicates maximum allowed
  [CIEDE2000](http://en.wikipedia.org/wiki/Color_difference#CIEDE2000)
  difference between colors. Used only in non-strict mode. By default it's 2.3
  which should be enough for the most cases. Increasing global default is not
  recommended, prefer changing tolerance for particular suites or states
  instead.

* `windowSize` – specify browser window dimensions (i.e. `1600x1200`). If not
  specified, the size of the window depends on WebDriver. :warning: You can't set specific resolutions for browser Opera or mobile platforms. They use only full-screen resolution.

* `sessionsPerBrowser` - how many WebDriver sessions  can be launched
  simultaneously for this browser. Default is 1. Increase the value if you
  want to speed up your tests.

* `suitesPerSession` - maximum amount of test suites to run in each web driver
  session. After limit is reached, session gets closed and new session gets
  started. By default is `.inf` (no limit). Set to smaller number if you are
  experiencing stability problems.

* `retry` – maximum amount of relaunch fallen tests with a critical error. If not
  specified, the fallen tests will not be relaunched (by default it's 0).

  Note that the same test never be performed in the same browser session.

* `screenshotMode` - image capture mode. There are 3 allowed values for this option:
    * `auto` (default). Mode will be obtained automatically.
    * `fullpage`. Gemini will deal with screenshot of full page.
    * `viewport`. Only viewport area will be used.

* `compositeImage` – allows testing of regions which bottom bounds are outside of a viewport height (default: `false`).
  In the resulting screenshot the area which fits the viewport bounds will be **joined** with the area which is outside
  of the viewport height.

## Sets

You can link some set of tests with certain browsers using `sets`.

Format of the `sets` section:
```yaml
sets:
  <set-name>:
    files:
     - <dir-with-test-files>
     ...
    browsers:
     - <browser-id-to-test-in>
     ...
```

* `files` - list of test files or directories with test files. Should be relative to project root directory. `gemini` by default. Also, you can use masks for this property. For example: `gemini/test-suites/*.gemini.js`. Can be a string if you want to specify just one file or directory.

* `browsers` - list of browser ids to run tests specified in `files`. All browsers by default.

If no sets specified then default set named `all` with all defaults will be created.

You can specify sets to run using CLI option [`--set`](./commands.md#common-cli-options).

## Overriding settings

All options can also be overridden via command-line flags or environment
variables. Priorities are the following:

* command-line option has the highest priority. It overrides environment
  variable and config file value.

* environment variable has second priority. It overrides config file value.

* config file value has the lowest priority.

* if no command-line option, environment variable or config file option
  specified, default is used.

To override config setting with CLI option, convert full option path to
`--kebab-case`. For example, if you want to run tests against different root
URL, call:

```
gemini test --root-url http://example.com
```

To save screenshots for IE9 to different location (considering you have
browser with `ie9` id in the config):

```
gemini update --browsers-ie9-screenshots-dir ./ie9-screens
```

To override setting with environment variable, convert its full path to
`snake_case` and add `gemini_` prefix. Above examples can be rewritten to use
environment variables instead of CLI options:

```
gemini_root_url=http://example.com gemini test
gemini_browsers_ie9_screenshots_dir=./ie9-screens gemini update
```
