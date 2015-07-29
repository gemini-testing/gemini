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
strictComparison: false
httpTimeout: 5000
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

system:
  projectRoot: ../project
  sourceRoot: ../project/src
  plugins:
    teamcity: true
  debug: true
  parallelLimit: 3
  diffColor: '#ff0000'
  referenceImageAbsence: 'error'
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

* `referenceImageAbsence` – treat the cases when a reference image does not
  exist as `error` or `warning`. Default value is `error`.

* `coverage` - `gemini` can gather and report CSS tests coverage. It supports
  source maps, so you can get the report even if you are using preprocessor or
  minifier. The JSON and html reports are saved to `gemini-coverage`
  directory. There are many settings under this section:

  - `enabled` – set to `true` to enable coverage reporting.

  - `exclude` – array of file paths or glob patterns to exclude from coverage
    report. For example:

      ```yaml
      system:
        coverage:
          exclude:
            - libs/**
            - path/to/some.css
            -
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
  test suites will be resolved relatively to it.

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

* `screenshotsDir` – directory to save reference screenshots to.
  `<projectRoot>/gemini/screens` by default.

* `tolerance` - indicates maximum allowed
  [CIEDE2000](http://en.wikipedia.org/wiki/Color_difference#CIEDE2000)
  difference between colors. Used only in non-strict mode. By default it's 2.3
  which should be enough for the most cases. Increasing global default is not
  recommended, prefer changing tolerance for particular suites or states
  instead.

* `strictComparison` – test will be considered as failed in case of any kind
  of error. By default, only noticeable differences are treated as test
  failure.

* `windowSize` – specify browser window dimensions (i.e. `1600x1200`). If not
  specified, the size of the window depends on WebDriver.

* `sessionPerBrowser` - how many WebDriver sessions  can be launched
  simultaneously for this browser. Default is 1. Increase the value if you
  want to speed up your tests.

* `suitesPerSession` - maximum amount of test suites to run in each web driver
  session. After limit is reached, session gets closed and new session gets
  started. By default is `.inf` (no limit). Set to smaller number if you are
  experiencing stability problems.

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
gemini gather --browsers-ie9-screenshots-dir ./ie9-screens
```

To override setting with environment variable, convert its full path to
`snake_case` and add `gemini_` prefix. Above examples can be rewritten to use
environment variables instead of CLI options:

```
gemini_root_url=http://example.com gemini test
gemini_browsers_ie9_screenshots_dir=./ie9-screens gemini gather 
```
