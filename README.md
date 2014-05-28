gemini
=======

[![Build Status](https://travis-ci.org/bem/gemini.svg?branch=master)](https://travis-ci.org/bem/gemini)
[![Code Climate](https://codeclimate.com/github/bem/gemini.png)](https://codeclimate.com/github/bem/gemini)
[![Coverage](https://codeclimate.com/github/bem/gemini/coverage.png)](https://codeclimate.com/github/bem/gemini)

Gemini is the utility for regression testing of web pages appearance.

Unlike other similar tools, tests not the whole pages, but
only specified blocks. This makes such tests more reliable and
more responsive to the changes of rest of webpage.

Tool is created at [Yandex](http://www.yandex.com/) and will be especially
useful to UI libraries developers.

## Dependencies

Currently, requires [`GraphicsMagick`](http://www.graphicsmagick.org/).

On MacOS X, it can be installed with [Homebrew](http://brew.sh/):

```
brew install graphicsmagick
```

Requires local or remote [selenium-grid](https://code.google.com/p/selenium/wiki/Grid2)
installation to test in other browsers, then [phantomjs](http://phantomjs.org/).

## Installation

After all dependencies have been satisfied, you can install package with `npm`:

```
npm install -g gemini
```

## Configuration

Gemini is configured using `.gemini.yml` file at the root of the project.
Example:

```yaml
rootUrl: http://site.example.com
gridUrl: http://selenium-grid.example.com:4444/wd/hub
browsers:
  - chrome
  - phantomjs
  - name: opera
    version: '12.06'
  - name: firefox
    version: '28.0'
  - name: firefox
    version: '27.0'
```

Config file fields:

* `rootUrl` - the root URL of your website. Target URLs of your test suites will
be resolved relatively to it.
* `gridUrl` - Selenium Grid URL to use for taking screenshots. Required, if
you want to run test in other browsers, then `phantomjs`.
* `browsers` - list of browsers to use for testing. Each browser should be available
on selenium grid.
   Each browser entry must include `name` key and may include `version` key. It is
   possible to use multiple versions of the same browser (if all versions are
   available on your grid instance).

   If version is omitted, any browsers of the specified name will be used.

   `- browser name` is a shortcut for `- name: browser name`

* `screenshotsDir` - directory to save reference screenshots to. Specified
relatively to config file directory. `gemini/screens` by default.
* `capabilities` - additional selenium capabilities to use for all browsers:

  ```yaml
  capabilities:
    option1: value,
    option2: value
  ```
  
  It is possible to set any capability, except `browserName` and `version` (use
  `browsers` option instead) and `takesScreenshot` (always set to `true`
  automatically);

* `debug` - turn on debug logging to the terminal

## Writing tests

For each block of website you need to test you need to write one or more *test suites*. 
Suite consists of few *states* that needs to be verified. For each state you need to
specify *action sequence* that gets block to this state.

### Defining suites

Test suite is defined with `gemini.suite` method. Example:

```javascript
var gemini = require('gemini');

gemini.suite('button', function(suite) {
    suite
        .setUrl('/path/to/page')
        .setCaptureElements('.button')
        .before(function(actions, find) {
            this.button = find('.buttons');
        })
        .capture('plain')
        .capture('hovered', function(actions, find) {
            actions.mouseMove(this.button);
        })
        .capture('pressed', function(actions, find) {
            actions.mouseDown(this.button);
        })
        .capture('clicked', function(actions, find) {
            actions.mouseUp(this.button);
        });
});
```
Arguments of a `gemini.suite`:

* `name` - the name of the new test suite. Name is displayed in reports and
affects screenshots filenames.
* `callback(suite)` - callback, used to set up the suite. Receives a suite
builder instance (described below).

### Suite builder methods:

All method are chainable:

* `setUrl(url)` - specifies address of web page to take screenshots from.
  URL is relative to `rootUrl` config field.
* `setCaptureElements('selector1', 'selector2', ...})` - specifies css
  selectors of the elements that will be used to determine a region of webpage 
  to capture.
  
  Capture region determined by minimum bounding rect for all
  of theese elements plus their `box-shadow` size.

  Can also accept an array:

  ```
  suite.setCaptureElements(['.selector1', '.selector2']);
  ```

  All tests in suite will fail if any of the elements will not be found.

* `skip([browser])` - skip all tests and nested suites for all browser,
  some specified browser or specified version of a browser:

  - `skip()` - skips tests and nested suites for all browsers;
  - `skip(browserName)` or `skip({name: browserName})` - skips tests for all
    versions of specified browser;
  - `skip({name: browserName, version: browserVersion})` - skips tests for
    particular version of a browser.
  - `skip([browser1, browser2, ...])` - skip tests for multiple browsers or
    versions.

  All browsers from subsequent calls to `.skip()` are added to the skip list:

  ```javascript
  suite.skip({name: 'browser1', version: '1.0'})
       .skip('browser2');
  ```

  is the same as:

  ```javascript
  suite.skip([
      {name: 'browser1', version: '1.0'},
      'browser2'
  ]);
  ```

* `capture(stateName, callback(actions, find))` - defines new state to capture.
  Optional callback describes a sequence of actions to bring the page to this state,
  starting from **previous** state of the suite. States are executed one after another
  in order of definition without browser reload in between.

  Callback accepts two arguments:
   * `actions` - chainable object that should be used to specify a
      series of actions to perform.
   * `find(selector)` -  use this function to search for an element to act on.
     Search is lazy and actually will be performed the first time element
     needed.
     Search will be performed once for each `find` call, so if you need to perform
     multiple actions on the same element save the result to some variable:

     ```javascript
     .capture('name', function(actions, find) {
         var button = find('.button');
         actions.mouseDown(button)
                .mouseUp(button);
     });
     ```


* `before(callback(actions, find))` - use this function to execute some code
  before the first state. The arguments of callback are the same as for `capture` callback.
  Context is shared between `before` callback and all of suite's state callbacks, so you
  can use this hook to lookup for element only once for all suite:

  ```javascript
  suite.before(function(actions, find) {
          this.button = find('.buttons');
      })
      .capture('hovered', function(actions, find) {
          actions.mouseMove(this.button);
      })
      .capture('pressed', function(actions, find) {
          actions.mouseDown(this.button);
      })

  ```

### Nested suites

Suites can be nested. In this case, inner suite inherits `url`, `captureElements`
from outer. This properties can be overridden in  inner suites without affecting the outer.
Each new suite causes reload of the browser, even if URL was not changed.

```javascript
var gemini = require('gemini');

gemin.suite('parent', function(parent) {
    parent.setUrl('/some/path')
          .setCaptureElements('.selector1', '.selector2');
          .capture('state');

    gemini.suite('first child', function(child) {
        //this suite captures same elements on different page
        child.setUrl('/other/path')
            .capture('other state');
    });

    gemini.suite('second child', function(child) {
        //this suite captures different elements on a same page
        child.setCaptureElements('.next-selector'})
             .capture('third state', function(actions, elements) {
                 ...
             })

        gemini.suite('grandchild', function(grandchild) {
            //child suites can have own childs
            grandchild.capture('fourth state');

        });
    });

    gemini.suite('third child', function(child) {
        //this child uses completely different URL and set
        //of elements
        child.setUrl('/some/another/path')
          .setCaptureElements('.different-selector');
          .capture('fifth state');

    });
});
```

### Available actions

By calling methods of the `actions` argument of a callback you can program
a series of steps to bring the block to desired state. All calls are chainable
and next step is always executed after previous one has completed. In the following
list `element` can be either CSS selector, or result of a `find` call:

* `click(element)` - mouse click at the center of the element.
* `doubleClick(element)` - mouse double click at the center of the element.
* `mouseDown(element, [button])` - press a mouse button at the center of the element. 
  Possible button values are: 0 - left, 1 - middle, 2 - right. By default, left button is used.
* `mouseUp(element)` - release previously pressed mouse button.
* `mouseMove(element, [offset])` - move mouse to the given element. Offset is specified relatively
  to the top left corner of the element. If not specified, mouse will be moved to the center of
  the element.
* `dragAndDrop(element, dragTo)` - drag `element` to other `dragTo` element.
* `executeJS(function(window))` - run specified function in a browser. The argument of a function
   is the browser's `window` object:

   ```javascript
   actions.executeJS(function(window) {
       window.alert('Hello!');
   });
   ```

   Note that function is executed in browser context, so any references to outer scope of callback won't work.

* `wait(milliseconds)` - wait for specified amount of time before next action. If it is the last action in
sequence, delay the screenshot for this amount of time.
* `sendKeys([element], keys)` - send a series of keyboard strokes to the speciefied element or
   currently active element on a page.

   You can send a special key using one of the provided constants, i.e:

   ```javascript
   actions.sendKeys(gemini.ARROW_DOWN);
   ```

   Full list of special keys:

    `NULL`, `CANCEL`, `HELP`, `BACK_SPACE`, `TAB`, `CLEAR`, `RETURN`, `ENTER`, `SHIFT`, `LEFT_SHIFT `, `CONTROL`,
    `LEFT_CONTROL`, `ALT`, `LEFT_ALT`, `PAUSE`, `ESCAPE`, `SPACE`, `PAGE_UP`, `PAGE_DOWN`, `END`, `HOME`, `LEFT`,
    `ARROW_LEFT`, `UP`, `ARROW_UP`, `RIGHT`, `ARROW_RIGHT`, `DOWN,`, `ARROW_DOWN`, `INSERT`, `DELETE`, `SEMICOLON`,
    `EQUALS`, `NUMPAD0`, `NUMPAD1`, `NUMPAD2`, `NUMPAD3`, `NUMPAD4`, `NUMPAD5`, `NUMPAD6`, `NUMPAD7`, `NUMPAD8`,
    `NUMPAD9`, `MULTIPLY`, `ADD`, `SEPARATOR`, `SUBTRACT`, `DECIMAL`, `DIVIDE`, `F1`, `F2`, `F3`, `F4`, `F5`,
    `F6`, `F7`, `F8`, `F9`, `F10`, `F11`, `F12`, `COMMAND`, `META`, `ZENKAKU_HANKAKU`.

## Commands

You need `selenium-server` up and running if you want to run tests in real browsers.
Without `selenium-server` only `phantomjs` browser can be used. In that case, run
`phantomjs` in webdriver mode before executing `gemini`:

```
phantomjs --webdriver=4444
```

### Gathering reference images

Once you have few suites written you need to capture reference images:

```
gemini gather [paths to suites]
```

If no paths are specified, every `.js` file from `gemini` directory will be read.
By default, configuration will be loaded from `.gemini.yml` in the current directory.
To specify other config, use `--config` or `-c` option.

### Running tests

To compare you reference screenshots with current state of blocks, use:

```
gemini test [paths to suites]
```

Paths and configuration are treated the same way as in `gather` command.

Each state with appearance different from reference image will be treated 
as the failed test.

By default, you'll see only names of the states. To get more information
you can use HTML reporter:

`gemini test --reporter html [paths to suites]`

This will produce HTML file in `gemini-report` directory. It will
display reference image, current image and difference between the two
for each state in each browser.

Other available reporters are:

* `tree` (default console reporter)
* `teamcity` (TeamCity console reporter)

You can also use multiple reporters at the same time using multiple `--reporter` options:

```
gemini test --reporter tree --reporter html
```

### Common cli options

* `--config`, `-c` - specify config file to use.
* `--root-url`, `-r` - use specified URL, instead of `rootUrl` setting from config file.
* `--grid-url`, `-r` - use specified URL, instead of `gridUrl` setting from config file.
* `--help` - display help message.
* `--version` - display version.
