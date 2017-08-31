# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="5.0.0-alpha.8"></a>
# [5.0.0-alpha.8](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.7...v5.0.0-alpha.8) (2017-08-31)


### Bug Fixes

* **errors:** stacktraces of custom errors should include error message ([63eb59b](https://github.com/gemini-testing/gemini/commit/63eb59b))
* pass current image path to reference image error ([968fe9a](https://github.com/gemini-testing/gemini/commit/968fe9a))



<a name="5.0.0-alpha.7"></a>
# [5.0.0-alpha.7](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.6...v5.0.0-alpha.7) (2017-08-28)



<a name="5.0.0-alpha.6"></a>
# [5.0.0-alpha.6](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.5...v5.0.0-alpha.6) (2017-08-02)



<a name="5.0.0-alpha.5"></a>
# [5.0.0-alpha.5](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.4...v5.0.0-alpha.5) (2017-07-11)


### Bug Fixes

* tests statistic should listen events on main runner ([e676c3a](https://github.com/gemini-testing/gemini/commit/e676c3a))



<a name="5.0.0-alpha.4"></a>
# [5.0.0-alpha.4](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.3...v5.0.0-alpha.4) (2017-07-04)


### Bug Fixes

* incorrect .js config resolving ([db6b539](https://github.com/gemini-testing/gemini/commit/db6b539))


### Features

* add method 'shouldSkip(browserId)' to suite instance ([bad551c](https://github.com/gemini-testing/gemini/commit/bad551c))
* provide the ability to modify retries count from plugins ([deafd55](https://github.com/gemini-testing/gemini/commit/deafd55))



<a name="5.0.0-alpha.3"></a>
# [5.0.0-alpha.3](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2017-06-08)



<a name="5.0.0-alpha.2"></a>
# [5.0.0-alpha.2](https://github.com/gemini-testing/gemini/compare/v5.0.0-alpha.0...v5.0.0-alpha.2) (2017-06-06)


### Bug Fixes

* bug with count of failed tests in the statistic ([ef550c5](https://github.com/gemini-testing/gemini/commit/ef550c5))



<a name="5.0.0-alpha.0"></a>
# [5.0.0-alpha.0](https://github.com/gemini-testing/gemini/compare/v4.19.3...v5.0.0-alpha.0) (2017-05-25)


### Features

* make setUrl work like url.resolve ([dcf6f17](https://github.com/gemini-testing/gemini/commit/dcf6f17))



<a name="4.19.3"></a>
## [4.19.3](https://github.com/gemini-testing/gemini/compare/v4.19.2...v4.19.3) (2017-05-03)


### Performance Improvements

* lazy load of images in HTML report for retries ([754368a](https://github.com/gemini-testing/gemini/commit/754368a))



<a name="4.19.2"></a>
## [4.19.2](https://github.com/gemini-testing/gemini/compare/v4.19.1...v4.19.2) (2017-03-27)


### Bug Fixes

* enable correct suite through suite collection api ([60c1147](https://github.com/gemini-testing/gemini/commit/60c1147))



<a name="4.19.1"></a>
## [4.19.1](https://github.com/gemini-testing/gemini/compare/v4.19.0...v4.19.1) (2017-02-15)


### Bug Fixes

* method "fullUrl" should resolve url in runtime ([e796dce](https://github.com/gemini-testing/gemini/commit/e796dce))
* Prevented EMFILE error (too many open files) ([e8e4dca](https://github.com/gemini-testing/gemini/commit/e8e4dca))



<a name="4.19.0"></a>
# [4.19.0](https://github.com/gemini-testing/gemini/compare/v4.18.2...v4.19.0) (2017-02-10)


### Features

* Pass suiteCollection on BEGIN event to allow to modify it ([7d04923](https://github.com/gemini-testing/gemini/commit/7d04923))



<a name="4.18.2"></a>
## [4.18.2](https://github.com/gemini-testing/gemini/compare/v4.18.1...v4.18.2) (2017-02-02)


### Bug Fixes

* prevent endless loop when suitesPerSession is set to infinity ([2b399b6](https://github.com/gemini-testing/gemini/commit/2b399b6))



<a name="4.18.1"></a>
## [4.18.1](https://github.com/gemini-testing/gemini/compare/v4.18.0...v4.18.1) (2017-01-25)


### Bug Fixes

* Make clickable reason-links for skipped results in html report ([d266665](https://github.com/gemini-testing/gemini/commit/d266665))



<a name="4.18.0"></a>
# [4.18.0](https://github.com/gemini-testing/gemini/compare/v4.17.1...v4.18.0) (2017-01-23)


### Features

* add method 'gemini.ctx' to tests API ([66f2aa6](https://github.com/gemini-testing/gemini/commit/66f2aa6))



<a name="4.17.1"></a>
## [4.17.1](https://github.com/gemini-testing/gemini/compare/v4.17.0...v4.17.1) (2017-01-18)


### Bug Fixes

* roll back striptags version without breaking changes ([cd4e26e](https://github.com/gemini-testing/gemini/commit/cd4e26e))



<a name="4.17.0"></a>
# [4.17.0](https://github.com/gemini-testing/gemini/compare/v4.16.0...v4.17.0) (2017-01-16)


### Features

* Add test filename to html report's metaInfo section ([0311f6d](https://github.com/gemini-testing/gemini/commit/0311f6d))



<a name="4.16.0"></a>
# [4.16.0](https://github.com/gemini-testing/gemini/compare/v4.15.0...v4.16.0) (2016-12-23)


### Bug Fixes

* log a path to an HTML report after tests finish ([86a8466](https://github.com/gemini-testing/gemini/commit/86a8466))
* set default reporter for command 'update' ([feb72bc](https://github.com/gemini-testing/gemini/commit/feb72bc))


### Features

* Add extended WebDriver error data in output ([73a26ed](https://github.com/gemini-testing/gemini/commit/73a26ed))



<a name="4.15.0"></a>
# [4.15.0](https://github.com/gemini-testing/gemini/compare/v4.14.4...v4.15.0) (2016-12-21)


### Features

* Allow to ignore every element, matching selector ([c36ed78](https://github.com/gemini-testing/gemini/commit/c36ed78))
* **html-reporter:** add ability to specify output path for each report ([b25409e](https://github.com/gemini-testing/gemini/commit/b25409e))



<a name="4.14.4"></a>
## [4.14.4](https://github.com/gemini-testing/gemini/compare/v4.14.1...v4.14.4) (2016-12-12)


### Bug Fixes

* correct implementation of doubleClick action ([f8746a9](https://github.com/gemini-testing/gemini/commit/f8746a9))
* emit browser start/stop events in correct places ([e8a427e](https://github.com/gemini-testing/gemini/commit/e8a427e))
* IE9 does not include pseudo-element styles ([906988b](https://github.com/gemini-testing/gemini/commit/906988b))
* Remove session id console output for skipped tests ([6aa92e1](https://github.com/gemini-testing/gemini/commit/6aa92e1))



<a name="4.14.3"></a>
## [4.14.3](https://github.com/gemini-testing/gemini/compare/v4.14.2...v4.14.3) (2016-12-05)


### Bug Fixes

* correct implementation of doubleClick action ([f8746a9](https://github.com/gemini-testing/gemini/commit/f8746a9))



<a name="4.14.2"></a>
## [4.14.2](https://github.com/gemini-testing/gemini/compare/v4.14.1...v4.14.2) (2016-11-24)


### Bug Fixes

* emit browser start/stop events in correct places ([e8a427e](https://github.com/gemini-testing/gemini/commit/e8a427e))
* IE9 does not include pseudo-element styles ([906988b](https://github.com/gemini-testing/gemini/commit/906988b))



<a name="4.14.1"></a>
## [4.14.1](https://github.com/gemini-testing/gemini/compare/v4.14.0...v4.14.1) (2016-11-22)


### Bug Fixes

* fix invalid urls to reference images ([85a426d](https://github.com/gemini-testing/gemini/commit/85a426d))
* fix invalid urls to reference images ([ed2ac15](https://github.com/gemini-testing/gemini/commit/ed2ac15))
* remove polyfill-service dependency ([364bcbf](https://github.com/gemini-testing/gemini/commit/364bcbf)), closes [#673](https://github.com/gemini-testing/gemini/issues/673) [#635](https://github.com/gemini-testing/gemini/issues/635)



<a name="4.14.0"></a>
# [4.14.0](https://github.com/gemini-testing/gemini/compare/v4.13.4...v4.14.0) (2016-11-16)


### Bug Fixes

* **documentation:** update information about using gemini options ([251329b](https://github.com/gemini-testing/gemini/commit/251329b))
* correct exit on 'SIGHUP', 'SIGINT' or 'SIGTERM' ([1f0ffbe](https://github.com/gemini-testing/gemini/commit/1f0ffbe))
* Implement advanced verification for suites with same names ([2572af5](https://github.com/gemini-testing/gemini/commit/2572af5))


### Features

* **html-reporter:** add ability to copy suite name and open suite urls ([6219b74](https://github.com/gemini-testing/gemini/commit/6219b74))


### Performance Improvements

* Use reference images instead of actual(current) in HTML report ([ef198bc](https://github.com/gemini-testing/gemini/commit/ef198bc))



<a name="4.13.4"></a>
## [4.13.4](https://github.com/gemini-testing/gemini/compare/v4.13.3...v4.13.4) (2016-11-07)


### Bug Fixes

* **config:** throw error if value contain not valid json string ([60cc4f0](https://github.com/gemini-testing/gemini/commit/60cc4f0))
* **config:** use JSON.parse for plugins values from cli/env ([6039fd1](https://github.com/gemini-testing/gemini/commit/6039fd1))



<a name="4.13.3"></a>
## [4.13.3](https://github.com/gemini-testing/gemini/compare/v4.13.1...v4.13.3) (2016-11-03)


### Bug Fixes

* **glob-extra:** replace isMasks to isMask ([830be2e](https://github.com/gemini-testing/gemini/commit/830be2e))
* **html-reporter:** don't store ref when it equal with current image ([3183c21](https://github.com/gemini-testing/gemini/commit/3183c21))
* **test:** improve some tests ([c56bdcb](https://github.com/gemini-testing/gemini/commit/c56bdcb))



<a name="4.13.2"></a>
## [4.13.2](https://github.com/gemini-testing/gemini/compare/v4.13.1...v4.13.2) (2016-10-26)


### Bug Fixes

* **glob-extra:** replace isMasks to isMask ([830be2e](https://github.com/gemini-testing/gemini/commit/830be2e))
* **test:** improve some tests ([c56bdcb](https://github.com/gemini-testing/gemini/commit/c56bdcb))



<a name="4.13.1"></a>
## [4.13.1](https://github.com/gemini-testing/gemini/compare/v4.13.0...v4.13.1) (2016-10-25)


### Bug Fixes

* do not show skipped tests in retries ([799dc80](https://github.com/gemini-testing/gemini/commit/799dc80))



<a name="4.13.0"></a>
# [4.13.0](https://github.com/gemini-testing/gemini/compare/v4.12.2...v4.13.0) (2016-10-19)


### Features

* **cli:** Add command 'list' to show list of browsers or sets from config ([b5e4b4a](https://github.com/gemini-testing/gemini/commit/b5e4b4a))
* Implement readRawConfig static API method ([b269b0b](https://github.com/gemini-testing/gemini/commit/b269b0b))



<a name="4.12.2">
## 4.12.2 - 20160-10-11

* Fix `startRunner` and `endRunner` to correctly wait for promises, returned
  from plugins.
* Various fixes related to `bluebird` migration. All "is not a function" errors
  now should be gone.
* Fix assignment to const error in html report.

<a name="4.12.1">
## 4.12.1 - 2016-10-06

* Restore 4.10 plugin loading order — plugins now loaded before any tests files
  are read.
* Internal promises library changed `bluebird`. This should make gemini a little
  bit faster.

<a name="4.12.0">
## 4.12.0 - 2016-10-03

* Added the ability to specify exclude paths in which the gemini tests will not be searched, see [documentation](https://github.com/gemini-testing/gemini/blob/master/doc/config.md#system-settings)
* Fixed bug which causes skip errors which might be occur in listeners of `START_RUNNER` and `END_RUNNER` events

<a name="4.11.3">
## 4.11.3 - 2016-09-29

* Second attempt of fixing order of file read events

<a name="4.11.2">
## 4.11.2 - 2016-09-27

* Fixed bug which causes emitting `beforeFileRead` after the file has already been read in GeminiFacade

<a name="4.11.1">
## 4.11.1 - 2016-09-26

Identical to 4.11, published by mistake

<a name="4.11.0">
## 4.11.0 - 2016-09-23

* Do not delay retry failed tests until all tests finish. Retry ASAP
* Added `events` field for `gemini` instance in plugins, see [documentation](https://github.com/gemini-testing/gemini/blob/master/doc/plugins.md) for more details.
* Updated `Quick start` section in documentation

<a name="4.10.0">
## 4.10.0 - 2016-09-19

* Lodash updated to v4.x
* Clone suite tree for each browser runner
* Use `catch` method instead of `fail` in q

<a name="4.9.4">
## 4.9.4 - 2016-09-13

* Fixed `Out of the bounds` error (see [#543])

[#543]: https://github.com/gemini-testing/gemini/issues/543

<a name="4.9.2">
## 4.9.2 - 2016-09-09

* Updated third party libraries, so Array.prototype methods won't be overwritten
  anymore

<a name="4.9.1">
## 4.9.1 - 2016-09-05

* Fixed abort of the broken session on test error
* Fixed incorrect creation of set with empty files
* Updated version of glob-extra

<a name="4.9.0">
## 4.9.0 - 2016-09-01

* Close browser session after error in a test
* Set left button as default for mouse button actions
* Fixed wrong validation of `grep` option from cli

<a name="4.8.0">
## 4.8.0 - 2016-08-30

* Fixed bug which causes `Cannot find files by mask gemini` error if sets in config are not specified (see [#569])
* Fixed bug which causes `/null` url in meta-info
* Displaying the number of updated images via command `gemini update` in flat reporter

<a name="4.7.2">
## 4.7.2 - 2016-08-26

* Correctly display the images in the html report in case suite names contain non-urlsafe characters.

<a name="4.7.1">
## 4.7.1 - 2016-08-25

* Fixed critical bug which causes failing of browser requests

<a name="4.7.0">
## 4.7.0 - 2016-08-25

* `beforeFileRead` and `afterFileRead` API events were added. This allows plugins to be notified
   when gemini is about to read a test file and when it was read
*  `CAPTURE` and `END_TEST` events were declared as deprecated. `UPDATE_RESULT` and `TEST_RESULT` events       should be used instead of them respectively
*  Added the ability to see in flat reporter which states were really updated via gemini update command
*  Added `sessionQuitTimeout` option which allows to change timeout for session termination
*  Disallowed usage of empty names for suites
*  Added nodejs@6.x support

<a name="4.6.0">
## 4.6.0 - 2016-08-11

* Added `GEMINI_SKIP_BROWSERS` environment variable support
* Added the ability to log config for each browser using `DEBUG=gemini:config` environment variable
* Fix: escape special symbols in HTML report
* Fix: correct displaying of test url in meta-info of an HTML report

<a name="4.5.0">
## 4.5.0 - 2016-08-05

* Retry only failed states on fail instead of all states of the suite
* Add ability to set file masks for test paths in a `sets` option
* Add ability to implement custom source path resolving for CSS files in coverage
* Fix: keep original stack when cloning error

<a name="4.4.4">
## 4.4.4 - 2016-07-27

* Revert code changes made for version 4.4.3

<a name="4.4.3">
## 4.4.3 - 2016-07-26

* Fix bug with resolving source paths in gemini coverage module

<a name="4.4.2">
## 4.4.2 - 2016-07-20

* Fixed retry of individual states (error with 'isCoverageEnabled on undefined')
* Support `changeOrientation` for `appium` below 1.5.x
* Back to upstream of `uglify-js`

<a name="4.4.1">
## 4.4.1 - 2016-07-18

* Froze uglify-js version at v2.6.4
* Fixed bug with suites per browser limit
* Fixed ignoring of a caret for devices with pixel ratio different from 1
* Output path to html report to a console
* Updated version of looks-same dependency to 3.0.0

<a name="4.4.0">
## 4.4.0 - 2016-06-17

* Added option `compositeImage` which allows to test areas with height larger than viewport one,
  see [documentation](https://github.com/gemini-testing/gemini/blob/v4.4.0/doc/config.md#browsers-settings)
  for more details.
* Capture a viewport instead of a full page for all browsers. :warning: Tests in firefox will fail after updating to
  this version if you test areas which bottom bounds are outside of a viewport height.
* Removed the hack for IE browsers related with two-step movement to `(0, 0)` on browser reset.
* Fix: do not fail test if a hidden element was added to method `ignoreElements`.
* Fix displaying of retries in HTML report after adding of `sessionId` in meta-info of HTML reporter.

<a name="4.3.0">
## 4.3.0 - 2016-06-02

* Added new browser option `screenshotMode` which allows to set an image capture mode, see the [documentation](https://github.com/gemini-testing/gemini/blob/v4.3.0/doc/config.md#browsers-settings) for more details.
* Added new action `changeOrientation` to tests API which allows to change orientation on touch enabled device, see the [documentation](https://github.com/gemini-testing/gemini/blob/v4.3.0/doc/tests.md#available-actions) for more details.
* Supported displaying of `sessionId` in meta-info of HTML reporter.
* Fix: do not emit an error if `browser.quit` fails, warning will be logged.
* Fix: support passing of `sessionId` to an error if launching of a browser fails.

<a name="4.2.0">
## 4.2.0 - 2016-05-26

* Added option `sessionRequestTimeout` which sets a timeout for getting of browser sessions

<a name="4.1.0">
## 4.1.0 - 2016-05-20

* Supported displaying of meta-info in HTML reporter which contains suite/state url
* Supported displaying of retry reasons in reporters
* Supported passing of a suite error to all states of this suite
* Dropped throwing of critical errors in states, this means that a state failure always emits an `err` event
* Fix: browser sessions will be freed immediately if there are no states to run instead of waiting for the end of all remaining running states in other browser sessions

<a name="4.0.4">
## 4.0.4 - 2016-04-29

* Fix: use top level windowSize
* Fix error object instance after serializing

<a name="4.0.3">
## 4.0.3 - 2016-04-26

* Fix image processing: use pixel ratio in subprocesses

<a name="4.0.2">
## 4.0.2 - 2016-04-25

* Fix failed suites count in summary line
* Throw error on image validation fail
* Show page screenshot on image validation error

<a name="4.0.1">
## 4.0.1 - 2016-04-20

* Fix documentation
* Fix: require default config by absolute path

<a name="4.0.0">
## 4.0.0 - 2016-04-20

* Fixed hang in browser pool queue when using `parallelLimit` option
* Image processing moved to workers (test speed increased, memory usage decreased)
* Added ability to set `tempDir` option from cli
* Do not retry failed test if it hasn't reference image

**BREAKING CHANGES**:

* Do not support node lower than 4.0
* Changed suite declaration. You don't need now to require gemini for each suite file
* Removed `gather command`. Use `update` command instead
* Now error data will be extended with path to image instead of image itself: `error.image` => `error.imagePath`

<a name="3.0.2">
## 3.0.2 - 2016-03-30

* Fix: Child suite context should have same data as parent has (@j0tunn)

<a name="3.0.1">
## 3.0.1 - 2016-03-24

* Fixed element find caching (@j0tunn)

<a name="3.0.0">
## 3.0.0 - 2016-03-23

* Fixed `CLIENT_STOPPED_SESSION` bug when performing setWindowSize in post actions (@j0tunn)
* Suite.browsers: ability to set browsers, in which suite should be run (@egavr)
* Added ability to use .js/.json config files (@j0tunn)
* Android support:
  * Do zoom reset after page load instead of before screenshot (@SwinX)
  * Fixed calibration for android emulators (@SwinX)
  * Fixed image crop for big pixelRatio (@SwinX)
* Enable uncaughtException logging (@SwinX)
* Fix coverage (@benedfit):
  * pass in all original options when processing media rules
  * check length of selector after pseudo-elements have been removed

**BREAKING CHANGES**:

* Removed skip method for actions (@j0tunn)
* Accumulate "before" and "after" actions for nested suites (@j0tunn)

<a name="2.1.1">
## 2.1.1 - 2016-01-27

* Fix: specified name for NoRefImageError (@SwinX)

<a name="2.1.0">
## 2.1.0 - 2016-01-25

* Fixed bug in enable/disable logic in suite collection - may not work properly when disabling
  all suites and enabling only some states in specific suite (@j0tunn)
* Added possibility to enable/disable suites by full name (@j0tunn)
* Added possibility to specify `grep` condition for `readTests` API method (@SwinX)

<a name="2.0.3">
## 2.0.3 - 2015-12-23

* Fix update command called without any options (@sipayRT)
* Limited pool fix: push defer queue if failed to free browser (@j0tunn)
* Add editor files to the .npmignore (@j0tunn)

<a name="2.0.0">
## 2.0.0 - 2015-12-19

* `gemini update` command: ability to update only new and changed references (@sipayRT)
* `SuiteCollection`: new API to run separate suites and states (@j0tunn)
* Fix: free browser when reset failed (@j0tunn)
* Fix: provide image for errors during actions chain execution (@leonsabr)
* Run heavy operations in separate processes (@j0tunn)
* Force quit on second Ctrl+C (@j0tunn)
* Do not get browser session for suites without states (@j0tunn)
* Do not get browser session and do not perform any pre-actions for skipped suite (@j0tunn)

**BREAKING CHANGES**:

* New skip method API (@leonsabr)
  * Browser now can be specified only by browser id matcher (string or RegExp)
  * skip now accepts optional second parameter - reason, which will be displayed in reporters
* Deprecated options removed: `strictComparison`, `referenceImageAbsence` (@SevInf, @j0tunn)
* Deprecated API method `gemini.buildDiff` removed (@j0tunn)
* Russian documentation removed (@j0tunn)
* `gemini.readTests` now returns `SuiteCollection` instance instead of `rootSuite` object (@j0tunn)
* `gemini gather` deprecated in favor of `gemini update` (@sipayRT)

<a name="1.1.6">
## 1.1.6 - 2015-12-04

* Remove restirction for maximum open concurrent sockets (@j0tunn)

<a name="1.1.5">
## 1.1.5 - 2015-12-03

* Show reference image if test failed due to lack of it (@sipayrt)
* Fixed result in HTML report for sibling states appear several times on retry (@SwinX)

<a name="1.1.4">
## 1.1.4 - 2015-11-27

* Fix: in LimitedPool next browser request will be triggered if failed to receive browser from underlying pool (@SwinX)

<a name="1.1.3">
## 1.1.3 - 2015-11-25

* Implemented TestCounter class for reporters (@SwinX)
* Fixed undefined session id in vflat reporter (@SwinX)
* Immediately quit browser if failed to create it (@SwinX)

<a name="1.1.2">
## 1.1.2 - 2015-11-20

* Fix: wrong initial-scale meta data (@sipayrt)
* Fix: build crashed on 'gather' command (@SwinX)

<a name="1.1.1">
## 1.1.1 - 2015-11-18

* Fix: html reporter correctly handles `error` event if no data about state passed

<a name="1.1.0">
## 1.1.0 - 2015-11-18

* Implemented suite retry on compare diff and critical errors (@SwinX)
* Only maximize PhantomJS browser if windowSize is not configured (@davidchin)
* Allow tests to skip by browser id (@davidchin)
* Do not fail tests on error from grid-side (@sipayrt)
* Fix: run 'afterHook' if some state failed (@j0tunn)
* Fix: run 'postActions' if state or 'afterHook' failed (@j0tunn)
* Fix: free browser after cancel (@j0tunn)
* Fix: keep original error if 'afterHook' or 'postActions' failed (@j0tunn)

<a name="1.0.6">
## 1.0.6 - 2015-11-06

* Show error message + whole page screenshot on test fail (@sipayrt)
* Fix: clean browsers pool after finalization (@SwinX)
* Fix: check for global window variable on client-side (@eroshinev)

<a name="1.0.5">
## 1.0.5 - 2015-11-03

* Do not fail tests if browsers specified from env does not exists in config (@sipayrt)

<a name="1.0.4">
## 1.0.4 - 2015-10-13

* Fix counting of skipped test by flat reporter (@sipayrt)
* Pass sessionId on events for correctly TC work (@sipayrt)

<a name="1.0.3">
## 1.0.3 - 2015-10-12

* Fix: return correct exit code on test failing (@sipayrt)

<a name="1.0.2">
## 1.0.2 - 2015-10-12

* Fix handling of END_RUNNER event (@sipayrt)

<a name="1.0.1">
## 1.0.1 - 2015-10-08

* Fix: END_RUNNER event delivered to plugins in case of critical error (@SwinX)
* Fix: make screenshot after prepareScreenshot() has been executed (@sipayrt)
* Remove spaces from env GEMINI_BROWSERS (@sipayrt)

<a name="1.0.0">
## 1.0.0 - 2015-10-05

* Add Android support (@SevInf)

* Fix: return same config object for each config.forBrowser request (@j0tunn)

* Fix "undefined" output instead of browser name in the flat reporter (@scf2k)

* Show current image for tests which have no reference images (@hatroman)

* Screenshot whole page when gemini can't find a selector (@scf2k)

* Add `retry` option. See [docs](doc/config.md) (@sipayrt)

* Fix: fire END_SUITE event when nested suites are done (@scf2k)

<a name="0.13.5">
## 0.13.5 - 2015-09-09

* Added the `vflat` reporter (@unlok)

<a name="0.13.4">
## 0.13.4 - 2015-08-30

* Path to the plugin configuration fixed (@SevInf)

* Sets support (@j0tunn)

<a name="0.13.3">
## 0.13.3 - 2015-08-27

* mouseUp action: make element argument optional (@just-boris).

* Print browserId and sessionId in critical error reports (@SevInf).

* html report: load report images in lazy mode (@scf2k).

<a name="0.13.2">
## 0.13.2 - 2015-08-17

* Fix: correct handling of no-ref-image error (@j0tunn).

<a name="0.13.1">
## 0.13.1 - 2015-08-15

* Inline sourcemaps support in coverage calculation (@j0tunn).

* Create HTML report dir before copying files (@SevInf).

* API: do not override options with CLI flags and env vars by default (@SevInf).

<a name="0.13.0">
## 0.13.0 - 2015-08-10

* Fail when removed option is detected and warn if removed env var is detected
  (@SevInf).

* Reports now always will be generated, even when there is a critical error
  (@zumra6a).

* Correctly cancel queued tests after critical error (@SevInf).

* Produce more debug information in various modules (@SevInf).

* In case of a critical error, try to print what test was executed when it
  happened (@SevInf).

* Corrected updates (@maximerassi).

<a name="0.13.0">
## 0.13.0-beta.1 — 2015-07-31

Previous version was published without a tarball once again. Republishing.

<a name="0.13.0">
## 0.13.0-beta — 2015-07-29

* BREAKING CHANGE: new config format. See [docs](doc/config.md).

  New config allows to set many previously global options on per-browser
  basis. The following things have changed in this config:

  - `rootUrl`, `gridUrl`, `tolerance`, `strictComparison`, `screenshotsDir`,
    `windowSize` options can now be set separately for each browser:

    ```yaml
    gridUrl: http://grid.example.com
    browsers:
      firefox:
        # Uses gridUrl from top level
        desiredCapabilities:
          ...
      chrome:
        # Overrides top-level value
        gridUrl: http://chrome.example.com
        desiredCapabilities:
          ...
    ```

  - `projectRoot`, `sourceRoot`, `plugins`, `debug`, `parallelLimit`,
    `diffColor`, `referenceImageAbsence` are moved into `system` section and
    can not be set per-browser.

    ```yaml
    system:
      debug: true
      diffColor: #ff0000
      plugins:
        teamcity: true
      ...
    ```

  - `browsers` are no longer default to `phantomjs`. If you've used this
    default, set up the browser explicitly:

    ```yaml
    browsers:
      phantomjs:
        desiredCapabilities:
          browserName: phantomjs
    ```

  - coverage settings are now grouped under `system.coverage` section:
    - to enable coverage, set `system.coverage.enabled` to true.
    - `coverageExclude` is moved to `system.coverage.exclude`.
    - `coverageNoHtml` is replaced by `system.coverage.html`. Set it to false
      to disable html report generaion.

  - `--noCalibrate` custom capability is replaced by `calibrate` option which
    can be set for every or any particular browser.

  - browser capabilites are set in `desiredCapabilites` option.

    ```yaml
    browsers:
      chrome:
        desiredCapabilities:
          browserName: 'chrome',
          version: '45'
    ```

  - top-level `capabilities` option is replaced by `desiredCapabilites`
    option.

  - `http` settings are removed. Use new option `httpTimeout` to set timeout.
    Setting retires is no longer possible.
  - `sessionMode` is replaced by more flexible `suitesPerSession` setting (see
    below).

* The way config options are overriden by CLI flags and environment variables
  are now unified (option path is converted to `--option-path` for cli and
  `gemini_option_path` for environment variables). Due to this change, some
  old flags and environment variables won't work:

  - `--sorce-root` and `GEMINI_SOURCE_ROOT` becomes `--system-source-root` and
    `gemini_system_source_root` respectively.

  - `--debug` and `GEMINI_DEBUG` becomes `--system-debug=true` and
    `gemini_system_debug` respectively.

  - `--coverage` and `GEMINI_COVERAGE` becomes
    `--system-coverage-enabled=true` and `gemini_system_coverage_enabled`
    respecitvely.

  - `--coverage-no-html` and `GEMINI_COVERAGE_NO_HTML` becomes
    `--system-coverage-html=false` and `gemini_system_coverage_html`
    respectively.

  - `GEMINI_ROOT_URL` becomes `gemini_root_url`.

  - `GEMINI_GRID_URL` becomes `gemini_grid_url`.

  - `GEMINI_SCREENSHOTS_DIR` becomes `gemini_screenshots_dir`.

  - `GEMINI_WINDOW_SIZE` becomes `gemini_window_size`.

* API: `Gemini` constuctor does not accepts overrides object anymore.

* `sessionMode` is replaced by `suitesPerSession` option which specifies
  number of test suites to run in a single WebDriver session. Value of `.inf`
  is equivalent to `perBrowser` session mode and value of `1` is equivalent to
  `perSuite`. This option can be set globally or separately for each browser.

* New option `sessionsPerBrowser` allows to launch multiple session for each
  browser and run tests in parallel.

<a name="0.12.8">
## 0.12.8 - 2015-07-23

* Correctly restore window size when `setWindowSize` is called in `before`
  callback (@SevInf).

<a name="0.12.7">
## 0.12.7 - 2015-07-20

* Correctly calculate element position if WebDriver returns screenshot thinner
  then document (@SevInf).

<a name="0.12.6">
## 0.12.6 - 2015-06-16

* More clear error when capture are is hidden (@hatroman).

* Mouse cursor is moved to (0,0) before the first test (@j0tunn).

<a name="0.12.5">
## 0.12.5 - 2015-05-28

Republish 0.12.4 due to another npm bug.

<a name="0.12.4">
## 0.12.4 - 2015-05-28

* Fix calibration to work in Chrome 43+ (@SevInf).

* Original window size is restored after suite with `setWindowSize` action is
  finished (@scff).

* `windowSize` option is ignored in Opera Presto browsers (@SevInf).

<a name="0.12.3">
## 0.12.3 - 2015-05-21

* Sizzle: work with selectors ending with space (@SevInf).

<a name="0.12.2">
## 0.12.2 - 2015-05-19

* Fix client bridge script injection (@SevInf).

<a name="0.12.1">
## 0.12.1 - 2015-05-18

CRITICAL BUG WAS INTRODUCED IN THIS VERSION.

Version was deleted from npm, use 0.12.2 instead.

* If CSS3 selectors are not supported by particular browser,
  [Sizzle.js](https://github.com/jquery/sizzle) will be used for all queries in
  that browser (@SevInf).

* Coverage now correctly detects intersection of the elements and capture area
  (@scff).

<a name="0.12.0">
## 0.12.0 - 2015-05-07

* When capturing element is visible compltely in the viewport do not scroll to
  element's location while taking the screenshot (@scff).

<a name="0.11.5">
## 0.11.5 - 2015-04-30

* Fix calibration in IE8 and add functional tests for it (@SevInf).

<a name="0.11.4">
## 0.11.4 - 2015-04-29

* Calibration affects only top and left sides of the screenshot (@scff).

<a name="0.11.3">
## 0.11.3 - 2015-04-24

* Take into account horizontal scrolling when validating capture area for
  viewport screenshot (@scf2k).

* Add missing pollyfills for IE8. This allows to gather coverage in ie8
  (@SevInf).

* Correctly report execptions, thrown during coverage gathering (@SevInf).

<a name="0.11.2">
## 0.11.2 - 2015-04-21

* Republish 0.11.1 due to npm registry bug.

<a name="0.11.1">
## 0.11.1 - 2015-04-21

* Fix crash after all tests are finished (@SevInf).

<a name="0.11.0">
## 0.11.0 - 2015-04-18

* Plugins support (@Saulis).

  Check out [documentation](doc/plugins.md) and some plugin examples:

  - [gemini-sauce](https://www.npmjs.com/package/gemini-sauce)

  - [gemini-express](https://www.npmjs.com/package/gemini-express)

* Add `flick` action for touch devices (@scf2k).

* Add `sessionMode` property which allows to choose when new WebDriver session
  is created (@SevInf).

* Automatically kill browser session on `SIGHUP`, `SIGINT` and `SIGTERM`
  (@j0tunn).

* Allow to switch image background in HTML reoport (@unlok).

* `url.resolve` is not used anymore for computing absolute URLs from `rootUrl`
  and suite URL. It is now just joined with a single `/` in between (@j0tunn).

* Update `png-image` so it can be built with `gcc` 4.6 (@j0tunn).

* Correctly expose `__gemini` variable in client scripts (@vlkosinov).

* Grep pattern now checked when suites load, not when they are executed
  (@hatroman).

* HTML report refactoring (@hatroman).

<a name="0.10.0">
## 0.10.0 - 2015-04-06

* Fix calibration to work in IE8 again (@SevInf)

* Client scripts which gemini injects into page are now bundled together and
  minified (@scf2k).

* Update `png-img` version bringing support for node `v0.12` and `iojs`
  (@j0tunn).

* Don't inject main client script twice (@scf2k)

* Ported 0.9.9 changes (@SevInf)

<a name="0.10.0">
## 0.10.0-beta.2 - 2015-03-26

* Use document height instead of body height to determine whether webdriver
  returns document or viewport screenshot (@SevInf)

<a name="0.10.0">
## 0.10.0-beta.1 - 2015-03-19

* Basic support for IE8 browser (@SevInf).

  This change required a large rewrite of the all client-side scripts which can
  cause some breaking changes. For example, bounds of a capture region are
  calculated more precisely now. You'll probably need to re-gather your
  screenshots.

* Calibration now correctly works in IE9 (@SevInf).

* Added an option `referenceImageAbsence` (@hatroman).

  This option allows to change default behaviour of the tests to produce the
  warning if there is no reference image. Default behaviour is still the test
  failure.

* Re-add `tolerance` setting, which now sets max allowed CIEDE2000 difference
  between image colors. It is now configurable on 3 levels:

  - `tolerance` option in config
  - `setTolerance` method for a suite
  - optional parameter to `capture` method:

    ```javascript
    suite.capture('name', {tolerance: 20}, function() {});
    ```

* Programmatic API method `buildDiff` is now deprecated: it has access only to
  global tolerance, so diff it produces might not show exactly what caused test
  to fail. Method is kept for backward compatibility, but users of
  a programmatic API now encouraged to use `saveDiffTo` method of test result
  (passed to reporter) instead.

* Warn if coverage for CSS file cannot be calculated due to same-origin policy
  (@SevInf)

<a name="0.9.9">
## 0.9.9 - 2015-04-06

* Adds new option `--browser` to the CLI and `browsers` to the API which allows
  to run tests in a subset of browsers (@SevInf).

<a name="0.9.8">
## 0.9.8 - 2015-02-11

* Work correctly if WebDriver implementation returns screenshot with
  a browser chrome. This is done via calibration step after first launch
  of the browsers (@scf2k).

* Add ability to ignore certain elements when comparing screenshots.
  Use `suite.ignoreElements(selector1, selector2, ...)` to specify
  the selectors to ignore (@SevInf).

* Add `tap` action for touch devices (@scf2k).

* `gemini` is now works correctly if page changes during the test (@scf2k).

* Correctly handle missing timeout in waitForElementXXX (@SevInf).

* Correctly report image path in `gather` API (@SevInf).

<a name="0.9.7">
## 0.9.7 - 2015-02-09

* Add new wait methods (@SevInf):

  - `waitForElementToShow`

  - `waitForElementToHide`

  - `waitForJSCondition`

<a name="0.9.6">
## 0.9.6 - 2015-01-27

* Work on a pages that modify `Array.prototype` (@SevInf).

<a name="0.9.5">
## 0.9.5 - 2014-12-10

* Works on Windows again (@SevInf).

<a name="0.9.4">
## 0.9.4 - 2014-12-03

* Add `sendFile` action which now should be used instead of `sendKeys` to set
  a file to `input[type=file]` elements (@SevInf).

* Correctly parse box-shadow in IE9 (@scf2k).

* Fail only single test if reference image is not found (@SevInf).

<a name="0.9.3">
## 0.9.3 - 2014-11-07

* Coverage generator now follows symlinks while resolving the paths to CSS
  files. So the final report will have real paths but not pointing to symlinks.

<a name="0.9.2">
## 0.9.2 - 2014-11-07

* Move the coverage HTML templating code to separate module (gemini-coverage).

* Detailed error message when capture region exceeds screenshot area. Such
  error also will now fail only single state instead of a whole testing process
  (@SevInf).

<a name="0.9.1">
## 0.9.1 - 2014-10-23

* Ignore `@keyframes` at-rule while collecting coverage (@scf2k).

<a name="0.9.0">
## 0.9.0 - 2014-10-22

* Replace `GraphicsMagick` with lightweight `png-img` library (@j0tunn).
  As for this version, `gemini` no longer requires any external tool for
  image processing.

* CSS coverage now supports source maps (@scf2k).

  If your CSS has the sourcemap, coverage report will show original files.

  You can use `sourceRoot` option to tell `gemini` where are your sources
  located on a filesystem.

* CSS coverages statistics will now also be written to `coverage.json` file
  (@scf2k).

* Add `coverageExclude` option to allow exclude certain files from coverage
  report (@scf2k).

* Add index page to coverage report and improve appearance of a the coverage
  pages (@scf2k).

* Restructure documentation and add quick start guide in russian and english
  (@jk708).

<a name="0.8.2">
## 0.8.2 - 2014-10-06

* Reset cursor position before reloading the page. When resetting it just after
  page load, old cursor position may trigger some transitions which will not be
  finished before first screenshot.

<a name="0.8.1">
## 0.8.1 – 2014-09-30

* `test` command will exit with correct codes

<a name="0.8.0">
## 0.8.0 - 2014-09-30

* New image comparison algorithm is implemented:

  - `gm compare` replaced with custom diff. For now, GraphicsMagick
  is still required for other image manipulations.

  - `tolerance` setting is removed in favor of "strict mode": by default, only
    noticable changes (according to ciede2000 metric) will be treated as
    failure, to treat all changes that way user can enable `strictComparison`
    option.

  - in case if some element in focus during test can potentially have blinking
    caret displayed, diff will try to ignore caret.

* Remove built-in TeamCity reporter. If you really want it, you can adapt 0.7.x
  reporter to the current version of `gemini` and publish it in separate
  package.

* Remove legacy ability to specify browsers as array which was deprecated since
  0.4.0.

* Add experimental [programmatic API](doc/programmatic-api.md).

* Add `--grep` option to `gather` and `test` commands, which allows to execute
  only suites, matching the pattern (@scf2k).

* Show required dimensions in error message when origin does not fir to
  full-page screenshot (@scf2k)

<a name="0.7.0">
## 0.7.0 - 2014-09-15

* Show meaningful error when capture area origin does not fit to full-page
  screenshot. This change can break some of your tests (@scf2k).

* Add experimental CSS-coverage report. Enable with `--coverage` CLI flag or
  `coverage: true` in config (@scf2k).

* Add ability to override `gridUrl`,`rootUrl`, `screenshotsDir`, `debug` config
  options by their respective CLI options or environment variables (@arikon).

* Add config option `windowSize` to specify default size of the browser windows
  (@scf2k).

* Add action `setWindowSize` to specify browser window size during the tests
  (@scf2k).


<a name="0.6.5">
## 0.6.5 - 2014-09-12

Was republished as 0.7.0 due to a breaking change.

<a name="0.6.4">
## 0.6.4 - 2014-08-13

* Add command line completion (@unlok).

* Show an error, when config file has unknown options.

* Add `focus(element)` action (@arikon).

<a name="0.6.3">
## 0.6.3 - 2014-08-05

* Allow to use empty string with `sendKeys`. It can be used to focus on an
  element without changing states.

<a name="0.6.2">
## 0.6.2 - 2014-08-01

* Reset mouse position for each suite. Previously, cursor may stay at the
  position left from a previous suite and some elements was captured with hover
  effect when there shouldn't be any.

<a name="0.6.1">
## 0.6.1 - 2014-07-30

* Fix incorrect capture region rounding, causing bottom row of the element to
  be cropped sometimes.

<a name="0.6.0">
## 0.6.0 - 2014-07-28

* `:before` and `:after` pseudo-elements outline and shadow are now taken into
  account when calculating capture region(@incorp).

  This change can break some of your tests. Re-gather reference images to fix
  the problem.

* Added `tolerance` config option which can be used to specify maximum error
  rate before images will be treated as unequal. Default tolerance to 0. This
  is stricter then previous versions: now every, even slightest difference
  between reference and current images will fail tests.

  Set `tolerance` to 0.001 in `.gemini.yml` to restore 0.5.x behavior.

* Coordinates of capture region are now rounded to capture maximal area.
  Previously, border pixels could be cropped, due to rounding error. This
  change can break some of your tests. Re-gather reference images to fix the
  problem.

* Added ability to change diff highlight color in config file.

* Change diff highlight style

* Global installations of `gemini` now runs local one, if available.

<a name="0.5.0">
## 0.5.0 - 2014-07-17

* Browsers are now launched once for each run (previously, they were launched
  once per suite). This greatly reduces total tests run time, but can break
  some of your code, i.e. each `mouseDown` should always be closed by
  `mouseUp`.

  Previously, this was not required if `mouseDown` was used once for suite.

  It will show warning if versions of the modules does not match.

* `flat` reporter replaces `tree`. Tree reporter can not work with new browser
  launch model.

* Add `parallelLimit` option that allows to limit number of browsers run in
  parallel.

* Add `suite.after()` which can be used to perform some action after all of the
  states without taking screenshot.

* Unknown errors, returned by Selenium have more detailed report.

* Fix `--version` option.

<a name="0.4.2">
## 0.4.2 - 2014-06-25

* Fix missing images in html report.

<a name="0.4.1">
## 0.4.1 - 2014-06-19

* Correctly detect crop region in Firefox

<a name="0.4.0">
## 0.4.0 - 2014-06-18

* Crop region for screenshots is calculated via client script inside browser
  instead of `gemini`. This allows to issue fewer requests to Selenium Server
  speeding up total tests run time. This feature breaks compatibility with old
  browsers (`IE` < 9).

* New config format, which allows to specify full set of capabilities for
  browsers:

  ```yaml
  browsers:
    phantomjs: phantomjs
    opera12:
        browserName: opera
        version: '12.06'
        platform: 'WINDOWS'
    firefox28:
        browserName: firefox
        version: '28.0'
    firefox27:
        browserName: firefox
        version: '27.0'
  ```

* Correctly capture screenshots of regions out of initial browser viewport in
  browsers, that can't capture full page (`Opera` and `Chrome` at the time of
  writing).

* `outline-width` of an elements is now also taken into account when
  calculating crop region.

* Add `debug` options to config file. If set to `true`, `gemini` will print
  debug logs to STDOUT. (@arikon).

* Add `http` section to config file which allows to configure HTTP timeout
  (`http.timeout`) retry count (`http.retries`) and delay between retries
  (`http.retryDelay`). (@arikon).

* Asynchronous errors stacktraces in browser actions (such as not found
  element) will point to users code.

* More HTTP requests to Selenium will run in parallel speeding up
  `gather`/`test` commands (@arikon).

* If `gemini` is run without subcommand, help text will be shown.

<a name="0.3.4">
## 0.3.4 - 2014-05-28

* Enhanced html report:

  - suites are now collapsible;

  - all but failed suites are collapsed by default;

  - buttons to expand all, collapse all and expand only errors are added;

  - stats of total numbers of tests run, failed, succeeded and skipped are
    shown at the top.

<a name="0.3.3">
## 0.3.3 - 2014-05-19

* Allow to use multiple reporters in `test` command.

* Throw error when creating multiple suites of the same name within the same
  parent.

* Throw error when creating multiple states of the same name within the suite.

* Throw error when creating suite that will be unable to run ( has states and
  hasn't url or capture region);

* Check argument types of `SuiteBuilder` methods.

* Check argument types of all actions methods.

* Shorter stacktraces for invalid elements errors.

* Correctly handle offsets in `mouseMove` actions.

* Fix error when `gridUrl` was required even if there is only `phantomjs`
  browser.

<a name="0.3.2">
## 0.3.2 - 2014-05-15

* Allow to override `gridUrl` and `rootUrl` settings with cli options
  `--grid-url` and `--root-url`.

* Correctly report error, when wrong argument passed to an action.

<a name="0.3.1">
## 0.3.1 - 2014-05-13

* Ability to set additional capabilities for all browsers, using `capabilities`
  option in `.gemini.yml`:

  ```yaml
  capabilities:
    option1: value,
    option2: value
  ```

* Non-existent directories, passed to `gather` and `test` commands will be
  filtered out

* If fatal error occurs, `gemini` will always exit with 1 status code

* If test fails or state error occurs, `gemini` will always exit with 2 status
  code.

* When `gemini` is unable to launch browser, more clearer error message will be
  displayed.

<a name="0.3.0">
## 0.3.0 -  2014-04-30

* Elements to take screen shots of and elements to perform action on are now
  defined differently. `setElements` and `setDynmaicElements` methods removed.

  New way to define elements for screenshot:

  ```javascript
  suite.setCaptureElements('.selector1', '.selector2', ...)
  ```

  Or using array:

  ```javascript
  suite.setCaptureElements(['.selector1', '.selector2', ...])
  ```

  To get element to perform action on, you can now pass selectors directly to
  the actions:

  ```javascript
  suite.capture('state', function(actions, find) {
      actions.click('.button');
  });
  ```

  To avoid multiple lookups for the same element you can use `find` function
  which is now passed to the state callback:

  ```javascript
  suite.capture('state', function(actions, find) {
      var button = find('.button');
      actions.mouseMove(button);
             .click(button);
  });
  ```

* Add `suite.before(function(action, find))` which can be used to perform some
  actions before the first state. Context is shared between before hook and all
  of suite's state callbacks.

  You can use `before` to look for element only once for the state:

  ```javascript
  suite.before(function(actions, find) {
      this.button = find('.buttons');
  })
  .capture('hovered', function(actions, find) {
      actions.mouseMove(this.button);
  })
  .capture('pressed', function(actions, find) {
      actions.mouseDown(this.button);
  });
  ```

  Or to perform some actions before first state without taking screenshot:

  ```javascript
  suite.before(function(actions, find) {
      actions.click('.button');
  });
  ```

* Add `suite.skip()` method which allows to skip suite in some set of browsers:

  - `suite.skip()` - skip in all browsers.

  - `suite.skip('chrome')` - skip in all versions of Chrome.

  - `suite.skip({name: 'chrome', version: '33.0'})` - skip in Chrome 33.0

  - `suite.skip(['chrome', 'opera'])` - skip in Chrome and Opera

* Public API now has constants for special keys to use in `sendKeys` actions
  (i.e. `gemini.CONTROL` for `CTRL` key).

<a name="0.2.1">
## 0.2.1 - 2014-04-23

* Fix a bug with incorrect reference to the suite in states. Because of this
  bug dynamic elements was not updated properly.

<a name="0.2.0">
## 0.2.0 - 2014-04-22

* New test suites API.  Plans are replaced by test suites defined by explicit
  call.

  Old version:

  ```javascript
  module.exports = function(plan) {
      plan.setName('some name')
          .setElements(...)
          .setDynamicElements(...)
          .capture(...)

  };
  ```

  New API:

  ```javascript
  var gemini = require('gemini');

  gemini.suite('some name', function(suite) {
      suite.setElements(...)
          .setDynamicElements(...)
          .capture(...)

  };

  ```

  Suites also can be nested. In this case, child suite inherits all properties
  from the parent.

  ```javascript
  gemin.suite('parent', function(suite) {
      gemini.suite('child', function(child) {
          gemini.suite('grandchild', function(grandchild) {

          });
      });
  });
  ```

* `.reload()` method is removed. Use nested suite if you need to reload
  browser.

* Added action to run any JS code in browser context:

  ```javascript
  actions.executeJS(function(window) {
      window.alert('Hello!');
  });
  ```

* `sendKeys` action can optionally take an receive an element to send keys to.

  ```javascript
  actions.sendKeys(elements.someInput, 'hello');
  ```

* Added ability to specify browser version in `.gemini.yml`

  ```yaml
  browsers:
    - {name: 'phantomjs', version: '1.9'}
  ```

* Tree reporter is now used for `gather` command.

<a name="0.1.1">
## 0.1.1 - 2014-04-08

* `phantomjs` always starts maximized. This fixes the error, when some shadows
  didn't fit in crop rectangle.

* Action on dynamic element that does not currently exists causes non-fatal
  error. Such error will fail only one state, the rest will continue running.

* `gather` command now reports browser name.

* browsers are always closed, even if there was an error.

<a name="0.1.0">
## 0.1.0 - 2014-03-27

* Initial release

[#569]: https://github.com/gemini-testing/gemini/issues/569
