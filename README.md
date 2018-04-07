# Gemini

[![npm](https://img.shields.io/npm/v/gemini.svg?maxAge=2592000)](https://www.npmjs.com/package/gemini)
[![Build Status](https://travis-ci.org/gemini-testing/gemini.svg?branch=master)](https://travis-ci.org/gemini-testing/gemini)
[![Windows Build Status](https://ci.appveyor.com/api/projects/status/github/gemini/gemini/branch/master?svg=true)](https://ci.appveyor.com/project/gemini/gemini/branch/master)
[![Coverage Status](https://img.shields.io/coveralls/gemini-testing/gemini.svg)](https://coveralls.io/r/gemini-testing/gemini)
[![Join the chat at https://gitter.im/gemini-testing/gemini](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/gemini-testing/gemini?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Stories on waffle.io](https://img.shields.io/badge/waffle-dashboard-green.svg)](http://waffle.io/gemini-testing/gemini)

[Gemini](https://github.com/gemini-testing/gemini) is a utility for regression
testing the visual appearance of web pages.

Gemini allows you to:

* Work with different browsers:

  - Google Chrome (tested in latest version)
  - Mozilla Firefox (tested in latest version)
  - IE8+
  - Opera 12+

* Test separate sections of a web page

* Include the `box-shadow` and `outline` properties when calculating element position and size

* Ignore some special case differences between images (rendering artifacts, text caret,
  etc.)

* Gather CSS test coverage statistics

**Gemini** was created at [Yandex](http://www.yandex.com/) and is especially
useful to UI library developers.

## Quick start

### Installing

```
npm install -g gemini
npm install -g selenium-standalone
selenium-standalone install
```

### Configuring

Put the `.gemini.js` file in the root of your project:

```javascript
module.exports = {
    rootUrl: 'http://yandex.ru',
    gridUrl: 'http://127.0.0.1:4444/wd/hub',

    browsers: {
        chrome: {
            desiredCapabilities: {
                browserName: 'chrome'
            }
        }
    }
};
```

### Writing tests

Write a test and put it in the `gemini` folder in the root of your project:

```javascript
gemini.suite('yandex-search', (suite) => {
    suite.setUrl('/')
        .setCaptureElements('.home-logo')
        .capture('plain');
});
```

### Saving reference images

You have written a new test and should save a reference image for it:
```
gemini update
```

### Running tests

Start `selenium-standalone` in a separate tab before running the tests:
```
selenium-standalone start
```

Run gemini tests:
```
gemini test
```

## Dependencies

Required software:

1. WebDriver server implementation. There are several options:

   - [Selenium Server](http://docs.seleniumhq.org/download/) — for testing in
     different browsers. Launch with the `selenium-standalone start` command.

   - [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/) — for
     testing in Google Chrome. Launch with the `chromedriver --port=4444 --url-base=wd/hub` command.

   - [PhantomJS](http://phantomjs.org/) — launch with the `phantomjs
     --webdriver=4444` command.

   - Cloud WebDriver services, such as
     [SauceLabs](http://saucelabs.com/) or
     [BrowserStack](http://www.browserstack.com/)

2. Compiler with support for C++11 (`GCC@4.6` or higher). This is a
   [png-img](https://github.com/gemini-testing/png-img) requirement.
   Compiling on Windows machines requires the [node-gyp prerequisites](https://github.com/nodejs/node-gyp#on-windows).

## Installing

To install the utility, use the [npm](https://www.npmjs.org/) `install` command:

```sh
npm install -g gemini
```
Global installation is used for launching commands.

## Configuring

**Gemini** is configured using a config file at the root of the project.
Gemini can use one of the following files:
* `.gemini.conf.js`
* `.gemini.conf.json`
* `.gemini.conf.yml`
* `.gemini.js`
* `.gemini.json`
* `.gemini.yml`

Let's say we want to run our tests only in the locally installed `PhantomJS`.

In this case, the minimal configuration file will only need to have the root URL
of your web app and the WebDriver capabilities of `PhantomJS`:
For example,

```yaml
rootUrl: http://yandex.com
browsers:
  PhantomJS:
    desiredCapabilities:
      browserName: phantomjs
```

Also, you need to run `PhantomJS` manually in `WebDriver` mode:

```
phantomjs --webdriver=4444
```


If you are using a remote WebDriver server, you can specify its URL with the
`gridUrl` option:

```yaml
rootUrl: http://yandex.com
gridUrl: http://selenium.example.com:4444/wd/hub

browsers:
  chrome:
    desiredCapabilities:
      browserName: chrome
      version: "45.0"

  firefox:
    desiredCapabilities:
      browserName: firefox
      version: "39.0"

```

You can also set up each browser to have its own node:

```yaml
rootUrl: http://yandex.com

browsers:
  chrome:
    gridUrl: http://chrome-node.example.com:4444/wd/hub
    desiredCapabilities:
      browserName: chrome
      version: "45.0"

  firefox:
    gridUrl: http://firefox-node.example.com:4444/wd/hub
    desiredCapabilities:
      browserName: firefox
      version: "39.0"

```

### Other configuration options

[See the details](doc/config.md) of the config file structure and available
options.

## Writing tests

Each of the blocks that are being tested may be in one of the determined states.
States are tested with the help of chains of step-by-step actions declared in a block's
test suites.

For example, let's write a test for a search block at
[yandex.com](http://www.yandex.com):

```javascript
gemini.suite('yandex-search', function(suite) {
    suite.setUrl('/')
        .setCaptureElements('.search2__input')
        .capture('plain')
        .capture('with text', function(actions, find) {
            actions.sendKeys(find('.search2__input .input__control'), 'hello gemini');
        });
});
```

We are creating a new test suite `yandex-search`, assuming that we will capture the
`.search2__input` element from the root URL `http://yandex.com`. We know that the
block has two states:

* `plain` — right after the page is loaded
* `with text` — with the `hello gemini` text inserted into `.search2__input .input__control`

States are executed one after another in the order in which they are defined, without the browser
reloading in between.

[See the details](doc/tests.md) of test creation methods.

## Using CLI

To complete the test creation procedure, you need to take reference shots using
the following command:

```
gemini update [paths to test suites]
```

To launch a test (to compare the current state of a block with a reference shot), use
the command:

```
gemini test [paths to test suites]
```

[See the details](doc/commands.md) of interaction with CLI and available
options.

## GUI

You can use the `Gemini` graphical user interface instead of the command line. It
is located in the [gemini-gui](https://github.com/gemini-testing/gemini-gui) package
and must be installed additionally:

```
npm install -g gemini-gui
```

GUI advantages:

* Handy preview of reference shots

* Clear real-time demonstration of the differences between a reference shot and
  the current state of a block

* Easy to update reference shots

## Plugins

Gemini can be extended with plugins. You can choose from the [existing
plugins](https://www.npmjs.com/browse/keyword/gemini-plugin) or [write your
own](doc/plugins.md). To use a plugin, install and enable it in your
`.gemini.yml`:

```yaml
system:
  plugins:
    some-awesome-plugin:
      plugin-option: value
```

## HTML report

To see the difference between the current state of a block and a reference picture
more clearly, use the [HTML reporter](https://github.com/gemini-testing/html-reporter) - plugin for gemini. This
plugin produces HTML report, which displays reference image, current image and
differences between them, for each state in each browser. When all tests are
completed, you will see a link to HTML report.

## Programmatic API

To use Gemini in your scripts or build tools, you can use the experimental
[programmatic API](doc/programmatic-api.md).

## Events

To learn more about all events in Gemini, see the [events documentation](doc/events.md).
