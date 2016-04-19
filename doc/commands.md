# Gemini commands

You need [Selenium-server](http://www.seleniumhq.org/download/) up and running
if you want to run tests in real browsers.

Without Selenium Server only [PhantomJS](http://phantomjs.org/) browser can be
used. In this case, run PhantomJS in webdriver mode before executing
**Gemini**:

```
phantomjs --webdriver=4444
```

## Updating reference images

Once you have few suites written or some code changed you need to capture or update reference images:

```
gemini update [paths to suites]
```
By default, this command will do two things:
 * update reference images that have changed
 * generate new reference images for new tests.

 Also, you can run this command with options:

 * `--diff` - update only existing images, states with no reference images will be ignored;
 * `--new` - generate only missing images.

If no paths are specified, each `.js` file from `gemini` directory will be
processed. By default, configuration will be loaded from `.gemini.yml` in the
current directory. To specify other config, use `--config` or `-c` option.

## Running tests

To compare you reference screenshots with current state of blocks, use:

```
gemini test [paths to suites]
```

Paths and configuration are treated the same way as in `update` command.

Each state with appearance different from reference image will be treated as
the failed test.

By default, only names of the states are listed in shell. To get more
information you can use HTML reporter:

`gemini test --reporter html [paths to suites]`

This will produce an HTML file in `gemini-report` directory. It will display
reference image, current image and differences between them, for each state in
each browser.

Available reporters are:

* `flat` (default console reporter);
* `vflat` (verbose console reporter);
* `html` for HTML report.

You can also use multiple reporters at the same time using multiple
`--reporter` options:

```
gemini test --reporter flat --reporter html
```

### CSS code coverage (experimental)

Path `--coverage` (or set `coverage` option in config file) to enable code
coverage reporter. **Gemini** will examine your CSS files and report CSS rules
that had been captured by at least one test completely (green color in
report), partially (yellow) or was not captured at all (red).

## Common CLI options

* `--config`, `-c` – specify config file to use.

* `--grep PATTERN` – execute only suites with names that match the regular
  expression pattern.

* `--browser ID` — execute suite only for specified browser id. Can be used
  multiple times. Can be also specified with `GEMINI_BROWSERS` environment
  variable. If both CLI option and env variable are set, CLI has precedence.

* `--help` – display help message.

* `--version` – display version.

## Overriding config options

See [config docs](./config.md);

## Shell completion

To enable Tab-completion of the shell commands add `. <(gemini completion)` to
your shell rc-file ( for example `~/.bashrc` for `bash` or `~/.zshrc` for
`zsh`).
