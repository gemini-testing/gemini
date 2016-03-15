# Writing Gemini tests

For each block of website that will be tested you need to write one or more
*test suites*. Suite consists of few *states* that need to be verified. For
each state you need to specify *action sequence* that gets block to this
state.

## Defining suites

Test suite is defined with `gemini.suite` method.

**Example**:

```js
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

* `name` – the name of the new test suite. Name is displayed in reports and
  affects screenshots filenames.

* `callback(suite)` – callback, used to set up the suite. Receives a suite
  builder instance (described below).

## Suite builder methods

All methods are chainable:

* `setUrl(url)` – specifies address of a web page to take screenshots from.
  URL is relative to `rootUrl` config field.

* `setCaptureElements('selector1', 'selector2', ...})` – specifies CSS
  selectors of the elements that will be used to determine a region of a web
  page to capture.

  Capture region is determined by minimum bounding rect for all
  of the elements plus their `box-shadow` size.

  Can also accept an array:

  ```js
  suite.setCaptureElements(['.selector1', '.selector2']);
  ```

  All tests in a suite will fail if none of the elements will be found.

* `ignoreElements('selector1', 'selector2', ...)` - elements, matching
  specified selectors will be ignored when comparing images.

* `setTolerance(value)` - overrides global tolerance value for the whole suite
  (See `tolerance`option description in [config](./config.md) documentation
  for details).

* `skip([browser])` – skip all tests and nested suites for:

  - `skip()` – all browsers;

  - `skip('id')` – browser with specified `id`;

  - `skip('id', comment)` – browser with specified `id` and show `comment` in the report;

  - `skip(/some RegExp/)` – browser with `id` which matches `/some RegExp/`;

  - `skip(/some RegExp/, comment)` – browser with `id` which matches `/some RegExp/` and show `comment` in the report;

  - `skip(['id1', /RegExp1/, ...])` – multiple browsers;

  - `skip(['id1', /RegExp1/, ...], comment)` – multiple browsers and show `comment` in the report.

  All browsers from subsequent calls to `.skip()` are added to the skip list:

  ```js
  suite
      .skip('id1')
      .skip(/RegExp1/);
  ```

  is equivalent to

  ```js
  suite.skip([
      'id1',
      /RegExp1/
  ]);
  ```

* `browsers([browser])` – run all tests and nested suites in specified browsers:

  - `browsers('id')` – browser with specified `id`;

  - `browsers(/some RegExp/)` – browser `id` which matches `/some RegExp/`;

  - `browsers(['id1', /RegExp1/, ...])` – multiple browsers.

* `capture(stateName, [options], callback(actions, find))` – defines a new
  state to capture. Optional callback describes a sequence of actions to bring
  the page to this state, starting from a **previous** state of the suite.
  States are executed one after another in order of definition without browser
  reload in between.

  Callback accepts two arguments:
   * `actions` – chainable object that should be used to specify a series of
     actions to perform.

   * `find(selector)` –  use this function to search for an element to act on.
     Search is lazy and actually will be performed the first time element is
     needed. Search will be performed once for each `find` call, so if you
     need to perform multiple actions on the same element, save the result to
     some variable:

     ```js
     .capture('name', function(actions, find) {
         var button = find('.button');
         actions.mouseDown(button)
             .mouseUp(button);
     });
     ```

    Options parameter allows you to override a `tolerance` value for one test:

    ```js
    .capture('name', {tolerance: 30}, function(actions, find) {

    });
    ```

    See `tolerance`option description in [config](./config.md)
    documentation for details.

* `before(callback(actions, find))` – use this function to execute some code
  before the first state. The arguments of a callback are the same as for
  `capture` callback. Context is shared between `before` callback and all of
  suite's state callbacks, so you can use this hook to lookup for an element
  only once for the whole suite:

  ```js
  suite
      .before(function(actions, find) {
          this.button = find('.buttons');
      })
      .capture('hovered', function(actions, find) {
          actions.mouseMove(this.button);
      })
      .capture('pressed', function(actions, find) {
          actions.mouseDown(this.button);
      });
  ```

* `after(callback(actions, find))` – use this function to execute some code
  after the last state. The arguments of a callback are the same as for
  `capture` and `before` callbacks and context is shared between all of them.

## Nested suites

Suites can be nested. In this case, inner suite inherits `url`,
`captureElements` from outer. This properties can be overridden in inner
suites without affecting the outer. Each new suite causes reload of the
browser, even if URL was not changed.

```js
var gemini = require('gemini');

gemini.suite('parent', function(parent) {
    parent.setUrl('/some/path')
        .setCaptureElements('.selector1', '.selector2');
        .capture('state');

    gemini.suite('first child', function(child) {
        //this suite captures same elements on different pages
        child.setUrl('/other/path')
            .capture('other state');
    });

    gemini.suite('second child', function(child) {
        //this suite captures different elements on the same page
        child.setCaptureElements('.next-selector')
            .capture('third state', function(actions, elements) {
                // ...
            })

        gemini.suite('grandchild', function(grandchild) {
            //child suites can have own childs
            grandchild.capture('fourth state');

        });
    });

    gemini.suite('third child', function(child) {
        //this suite uses completely different URL and set of elements
        child.setUrl('/some/another/path')
            .setCaptureElements('.different-selector');
            .capture('fifth state');
    });
});
```

## Available actions

By calling methods of the `actions` argument of a callback you can program
a series of steps to bring the block to desired state. All calls are chainable
and next step is always executed after previous one has completed. In the
following list `element` can be either CSS selector or result of a `find`
call:

* `click(element)` – mouse click at the center of the element.

* `doubleClick(element)` – mouse double click at the center of the element.

* `mouseDown(element, [button])` – press a mouse button at the center of the
  element. Possible button values are: 0 – left, 1 – middle, 2 – right. By
  default, left button is used.

* `mouseUp([element], [button])` – release previously pressed mouse button. If
  element is specified, move mouse to element and release then.

* `mouseMove(element, [offset])` – move mouse to the given element. Offset is
  specified relatively to the top left corner of the element. If not
  specified, mouse will be moved to the center of the element.

* `dragAndDrop(element, dragTo)` – drag `element` to other `dragTo` element.

* `flick(speed, swipe)` - flick starting anywhere on the screen using
  `speed.x` and `speed.y` speed.

* `flick(offsets, speed, element)` - flick element with starting point at its
  center by `offsets.x` and `offset.y` offsets.

* `executeJS(function(window))` – run specified function in a browser. The
  argument of a function is the browser's `window` object:

  ```js
  actions.executeJS(function(window) {
      window.alert('Hello!');
  });
  ```

   Note that function is executed in a browser context, so any references to
   outer scope of callback won't work.

* `wait(milliseconds)` – wait for specified amount of time before next action.
  If it is the last action in sequence, delay the screenshot for this amount
  of time.

* `waitForElementToShow(selector, [timeout])` - waits until element, matched
  by `selector` will become visible. Fails if element does not appear after
  `timeout` milliseconds (1000 by default).

* `waitForElementToHide(selector, [timeout])` - waits until element, matched
  by `selector` will become invisible or will be completely removed from DOM.
  Fails if element still visible after `timeout` milliseconds (1000 by
  default).

* `waitForJSCondition(function(window), timeout)` - waits until specified
  function return `true`. Function will be executed in browser context, so any
  references to outer scope won't work. Fails if after `timeout` milliseconds
  function still returns `false` (1000 by default).

* `sendKeys([element], keys)` - send a series of keyboard strokes to the
  specified element or currently active element on a page.

   You can send a special key using one of the provided constants, i.e:

   ```js
   actions.sendKeys(gemini.ARROW_DOWN);
   ```

Full list of special keys (there are shortcuts for commonly used keys):

`NULL`, `CANCEL`, `HELP`, `BACK_SPACE`, `TAB`, `CLEAR`, `RETURN`, `ENTER`,
`LEFT_SHIFT` ⇔ `SHIFT`, `LEFT_CONTROL` ⇔ `CONTROL`, `LEFT_ALT` ⇔ `ALT`,
`PAUSE`, `ESCAPE`, `SPACE`, `PAGE_UP`, `PAGE_DOWN`, `END`, `HOME`,
`ARROW_LEFT` ⇔ `LEFT`, `ARROW_UP` ⇔ `UP`, `ARROW_RIGHT` ⇔ `RIGHT`,
`ARROW_DOWN` ⇔ `DOWN`, `INSERT`, `DELETE`, `SEMICOLON`, `EQUALS`, `NUMPAD0`,
`NUMPAD1`, `NUMPAD2`, `NUMPAD3`, `NUMPAD4`, `NUMPAD5`, `NUMPAD6`, `NUMPAD7`,
`NUMPAD8`, `NUMPAD9`, `MULTIPLY`, `ADD`, `SEPARATOR`, `SUBTRACT`, `DECIMAL`,
`DIVIDE`, `F1`, `F2`, `F3`, `F4`, `F5`, `F6`, `F7`, `F8`, `F9`, `F10`, `F11`,
`F12`, `COMMAND` ⇔ `META`, `ZENKAKU_HANKAKU`.

* `sendFile(element, path)` – send file to the specified `input[type=file]`
  element. `path` must exist at local system (the one which `gemini` is
  executed on).

* `focus(element)` – set a focus to a specified element.

* `setWindowSize(width, height)` – change browser window dimensions.

* `tap(element)` - tap specified element on touch enabled device.
