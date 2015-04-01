Gemini quick start
=======

[![Join the chat at https://gitter.im/bem/gemini](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/bem/gemini?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/bem/gemini.svg?branch=master)](https://travis-ci.org/bem/gemini)
[![Coverage Status](https://img.shields.io/coveralls/bem/gemini.svg)](https://coveralls.io/r/bem/gemini)

[Gemini](https://github.com/bem/gemini) is the utility for regression testing of web pages appearance.

Its key features are:

* Compatibility with different browsers (see [notes about IE](doc/ie-support.md));
* Ability to test separate sections of a web page;
* Position and size of an element are calculated including its `box-shadow` and `outline` properties;
* Some special case differences between images (rendering artifacts, text caret, etc.) are ignored;
* CSS test coverage statistics.

**Gemini** is created at [Yandex](http://www.yandex.com/) and will be especially
useful to UI libraries developers.

Current document is a quick step-by-step guide that describes installation, configuration and usage of **Gemini**.

## Dependencies

Required software:

1. [Selenium Server](http://docs.seleniumhq.org/download/) – for testing in different browsers.
2. [PhantomJS](http://phantomjs.org/) – headless version of a WebKit browser.
3. Compiler with full support of C++11 (`GCC@4.7` or higher). This is a [png-img](https://github.com/bem/png-img) requirement.

## Installation
### Global installation

To install the utility use [npm](https://www.npmjs.org/) command `install`:

```
    npm install -g gemini
```
Global installation is used for commands launch.

### Local installation

To write the tests you will also need local installation of `Gemini`. Run the following command in project directory:

```
npm install gemini
```


## Configuration

**Gemini** is configured using `.gemini.yml` file at the root of the project.

### Usage with PhantomJS
In case only local `PhantomJS` copy is being used for testing, the configuration is as simple as declaring the website `rootUrl` option.

For example,

```yaml
rootUrl: http://yandex.com
```

Also, you need to run `PhantomJS` manually in a `WebDriver` mode:

```
phantomjs --webdriver=4444
```

### Usage with Selenium

In order to run tests in different browsers use `Selenium`. You may choose remote `Selenium Grid`, a cloud service (such as [SauceLabs](http://saucelabs.com/) or [BrowserStack](http://www.browserstack.com/)), or run a local server:

```
java -jar selenium-server-standalone.jar
```
Additionally, declare `Selenium Server` address and a list of browsers used for testing in configuration file:

```yaml
rootUrl: http://yandex.com
gridUrl: http://localhost:4444/wd/hub

browsers:
  chrome:
    browserName: chrome
    version: "37.0"

  firefox:
    browserName: firefox
    version: "31.0"

```

In `browsers` section, *keys* are unique browser ids (chosen by user) and *values* are [DesiredCapabilites](https://code.google.com/p/selenium/wiki/DesiredCapabilities) of a corresponding browser.

### Other configuration options
[See the details](doc/config.md) of a config file structure.

## Writing tests

Each of the blocks that are being tested may be in one of the determined states. States are tested with the help of chains of step-by-step actions declared in test suites of a block.

For example, let's write a test for a search block at [yandex.com](http://www.yandex.com):

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

We create a new test suite `yandex-search` and assume that we will capture the `.main-table` element from a root URL `http://yandex.com`. We know that the block has two states:

* `plain` – right after the page is loaded;
* `with text` – with `hello gemini` text inserted into `.input__control`.

States are executed one after another in order of definition without browser reload in between.

[See the details](doc/tests.md) of tests creation methods.

## Using CLI

To complete the test creation procedure you need to take reference shots using the following command:

```
gemini gather [paths to test suites]
```
For test launch (to compare current state of a block with a reference shot) use the command:

```
gemini test [paths to test suites]
```

To see the difference between current state of a block and a reference picture more clearly, use HTML reporter:

```
gemini test --reporter html [paths to test suites]
```

You can use both console and HTML reporters at the same time:

```
gemini test --reporter html --reporter flat [paths to test suites]
```

[See the details](doc/commands.md) of interaction with CLI and available options.

## GUI

Instead of a command line you can use graphical user interface of `Gemini`. It is located in
[gemini-gui](https://github.com/bem/gemini-gui) package and must be installed additionally:

```
npm install -g gemini-gui
```

GUI advantages:
* Handy reference shots preview;
* Clear real-time demonstration of differences between a reference shot and current state of a block;
* Easy update of reference shots.

## Programmatic API

To use **Gemini** in your scripts or build tools plugins you can use experimental
[programmatic API](doc/programmatic-api.md).
