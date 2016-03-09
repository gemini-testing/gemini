# Gemini quick start

[![Join the chat at
https://gitter.im/gemini-testing/gemini](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/gemini-testing/gemini?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build
Status](https://travis-ci.org/gemini-testing/gemini.svg?branch=master)](https://travis-ci.org/gemini-testing/gemini)

[![Coverage
Status](https://img.shields.io/coveralls/gemini-testing/gemini.svg)](https://coveralls.io/r/gemini-testing/gemini)

[Gemini](https://github.com/gemini-testing/gemini) is the utility for regression
testing of web pages appearance.

Its key features are:

* Compatibility with different browsers:

  - Google Chrome (tested in latest version)
  - Mozilla Firefox (tested in latest version)
  - [IE8+](doc/ie-support.md)
  - Opera 12+;

* Ability to test separate sections of a web page;

* Position and size of an element are calculated including its `box-shadow` and
  `outline` properties;

* Some special case differences between images (rendering artifacts, text caret,
  etc.) are ignored;

* CSS test coverage statistics.

**Gemini** is created at [Yandex](http://www.yandex.com/) and will be especially
useful to UI libraries developers.

Current document is a quick step-by-step guide that describes installation,
configuration and usage of **Gemini**.

## Dependencies

Required software:

1. WebDriver server implementation. There are few possible options:

   - [Selenium Server](http://docs.seleniumhq.org/download/) – for testing in
     different browsers.

   - [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/) - for
     testing in Google Chrome.

   - [PhantomJS](http://phantomjs.org/) — launch with `phantomjs
     --webdriver=4444` command.

   - Cloud WebDriver services, such as
     [SauceLabs](http://saucelabs.com/) or
     [BrowserStack](http://www.browserstack.com/)

2. Compiler with support of C++11 (`GCC@4.6` or higher). This is a
   [png-img](https://github.com/gemini-testing/png-img) requirement.

## Installation

### Global installation

To install the utility use [npm](https://www.npmjs.org/) command `install`:

```sh
npm install -g gemini
```
Global installation is used for commands launch.

### Local installation

To write the tests you will also need local installation of `Gemini`. Run the
following command in project directory:

```sh
npm install gemini
```

## Configuration

**Gemini** is configured using config file at the root of the project.
Gemini can use one of the next files:
* `.gemini.conf.js`
* `.gemini.conf.json`
* `.gemini.conf.yml`
* `.gemini.js`
* `.gemini.json`
* `.gemini.yml`

Lets say we want to run our tests only in locally installed `PhantomJS`.

In this case, the minimal configuration file will need to have only the root url
of your web app and WebDriver capabilities of `PhantomJS`:
For example,

```yaml
rootUrl: http://yandex.com
browsers:
  PhantomJS:
    desiredCapabilities:
      browserName: phantomjs
```

Also, you need to run `PhantomJS` manually in a `WebDriver` mode:

```
phantomjs --webdriver=4444
```


In case you are using remote WebDriver server, you can specify its URL with
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
  gridUrl: http://chrome-node.example.com:4444/wd/hub
  chrome:
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

[See the details](doc/config.md) of a config file structure and available
options.

## Writing tests

Each of the blocks that are being tested may be in one of the determined states.
States are tested with the help of chains of step-by-step actions declared in
test suites of a block.

For example, let's write a test for a search block at
[yandex.com](http://www.yandex.com):

```javascript
var gemini = require('gemini');

gemini.suite('yandex-search', function(suite) {
    suite.setUrl('/')
        .setCaptureElements('.main-table')
        .capture('plain')
        .capture('with text', function(actions, find) {
            actions.sendKeys(find('.input__control'), 'hello gemini');
        });
});
```

We create a new test suite `yandex-search` and assume that we will capture the
`.main-table` element from a root URL `http://yandex.com`. We know that the
block has two states:

* `plain` – right after the page is loaded;
* `with text` – with `hello gemini` text inserted into `.input__control`.

States are executed one after another in order of definition without browser
reload in between.

[See the details](doc/tests.md) of tests creation methods.

## Using CLI

To complete the test creation procedure you need to take reference shots using
the following command:

```
gemini gather [paths to test suites]
```

For test launch (to compare current state of a block with a reference shot) use
the command:

```
gemini test [paths to test suites]
```

To see the difference between current state of a block and a reference picture
more clearly, use HTML reporter:

```
gemini test --reporter html [paths to test suites]
```

You can use both console and HTML reporters at the same time:

```
gemini test --reporter html --reporter flat [paths to test suites]
```

[See the details](doc/commands.md) of interaction with CLI and available
options.

## GUI

Instead of a command line you can use graphical user interface of `Gemini`. It
is located in [gemini-gui](https://github.com/gemini-testing/gemini-gui) package
and must be installed additionally:

```
npm install -g gemini-gui
```

GUI advantages:

* Handy reference shots preview;

* Clear real-time demonstration of differences between a reference shot and
  current state of a block;

* Easy update of reference shots.

## Plugins

Gemini can be extended with plugins. You could choose from the [existing
plugins](https://www.npmjs.com/browse/keyword/gemini-plugin) or [write your
own](doc/plugins.md). To use the plugin, install and enable it in your
`.gemini.yml`:

```yaml
system:
  plugins:
    some-awesome-plugin:
      plugin-option: value
```

## Programmatic API

To use Gemini in your scripts or build tools you can use experimental
[programmatic API](doc/programmatic-api.md).
