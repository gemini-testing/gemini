gemini
=======

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
  - opera
  - firefox
  - phantomjs
```

Config file fields:

* `rootUrl` - the root URL of your website. Target URLs of your test plans will
be resolved relatively to it.
* `gridUrl` - Selenium Grid URL to use for taking screenshots. Required, if
you want to run test in other browsers, then `phantomjs`.
* `browsers` - list of browsers to use for testing. Each browser should be available
on selenium grid.
* `screenshotsDir` - directory to save reference screenshots to. Specified
relatively to config file directory. `gemini/screens` by default.

## Writing tests

For each block of website you need to test you need to write *test plan*. Plan
consists of few *states* that needs to be verified. For each state you need to
specify *action sequence* that gets block to this state.

Each test plan file is a node module exporting single function which
configures the plan. Example:

```javascript
module.exports = function(plan) {
    plan.setName('button')
        .setUrl('/path/to/page')
        .setElements({
            button: '.button'
        })
        .capture('plain')
        .capture('hovered', function(actions, elements) {
            actions.mouseMove(elements.button);
        })
        .capture('pressed', function(actions, elements) {
            actions.mouseDown(elements.button);
        })
        .capture('clicked', function(actions, elements) {
            actions.mouseUp(elements.button);
        });
};
```

### Plan methods

All method are chainable:

* `setName(name)` - sets the plan name. Displayed in reports and affects
  screenshots filenames.
* `setUrl(url)` - specifies address of web page to take screenshots from.
  URL is relative to `rootUrl` config field.
* `setElements({name1: 'selector', name2: 'selector', ...})` - specifies elements
  that will be used to determine a region of webpage to capture. This elements
  will be also available by their names in state callbacks.
  
  Capture region determined by minimum bounding rect for all
  of theese elements plus their `box-shadow` size.

* `setDynamicElements({name1: 'selector', name2: 'selector', ...})` - same as
  `setElements`, but specifies elements that does not appear in DOM tree
  at the moment page loaded. Dynamic elements will make your tests slower, so
  don't use it for static content.

* `capture(stateName, callback(actions, element))` - defines new state to capture.
  Optional callback describes a sequence of actions to bring the page to this state,
  starting from **previous** state. States are executed one after another in order
  of definition without browser reload in between.

  Callback accepts two arguments:
   * `actions` - chainable object that should be used to specify a
      series of actions to perform.
   * `elements` - hash of elements, defined by plan's `setElements` call.
      Keys of object are the same as defined in plan. Values are internal
      objects representing browser elements.
      
      No method of elements should be called directly - they should be
      used only as arguments to an `actions` calls.

* `reload()` - should be used before `capture` call to reload a browser before
  next state. Can be used to get rid of side effects, caused by previous states.

### Available actions

By calling methods of the `actions` argument of a callback you can program
a series of steps to bring the block to desired state. All calls are chainable
and next step is always executed after previous one has completed. The
full list of actions:

* `click(element)` - mouse click at the center of the element.
* `doubleClick(element)` - mouse double click at the center of the element.
* `mouseDown(element, [button])` - press a mouse button at the center of the element. 
  Possible button values are: 0 - left, 1 - middle, 2 - right. By default, left button is used.
* `mouseUp(element)` - release previously pressed mouse button.
* `mouseMove(element, [offset])` - move mouse to the given element. Offset is specified relatively
  to the center of the element, `{x: 0, y: 0}` by default.
* `dragAndDrop(element, dragTo)` - drag `element` to other `dragTo` element.
* `sendKeys(keys)` - send a series of keyboard strokes to the web page.
* `wait(milliseconds)` - wait for specified amount of time before next action. If it is the last action in
sequence, delay the screenshot for this amount of time.

## Commands

You need `selenium-server` up and running if you want to run tests in real browsers.
Without `selenium-server` only `phantomjs` browser can be used. In that case, run
`phantomjs` in webdriver mode before executing `gemini`:

```
phantomjs --webdriver=4444
```

### Gathering reference images

Once you have few plans written you need to capture reference images:

```
gemini gather [paths to plans]
```

If no paths are specified, every `.js` file from `gemini` directory will be read.
By default, configuration will be loaded from `.gemini.yml` in the current directory.
To specify other config, use `--config` or `-c` option.

### Running tests

To compare you reference screenshots with current state of blocks, use:

```
gemini test [paths to plan]
```

Paths and configuration are treated the same way as in `gather` command.

Each state with appearance different from reference image will be treated 
as the failed test.

By default, you'll see only names of the states. To get more information
you can use HTML reporter:

`gemini test --reporter html [paths to plans]`

This will produce HTML file in `gemini-report` directory. It will
display reference image, current image and difference between the two
for each state in each browser.
