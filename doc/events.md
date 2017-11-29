# Gemini events

* `INIT` - emitted before any job start (`test`, `update` or `readTests`). If handler returns a promise then job will start only after the promise will be resolved. Emitted only once no matter how many times job will be performed.

* `AFTER_TESTS_READ` - emitted after all tests were read (during `test`, `update` or `readTests` call). The event is emitted with 1 argument `data`:
    * `data.suiteCollection` - suite collection with all suites parsed from test files

* `UPDATE_RESULT` — emitted always during update. The event is emitted with 1 argument `result`:
    * `result.imagePath` — absolute path to the reference image
    * `result.updated` — boolean value which is `true` when reference image have been changed and `false` when not

* `TEST_RESULT` — emitted always after the test is completed. The event is emitted with 1 argument `result`:
    * `result.referencePath` — absolute path to the reference image
    * `result.currentPath` — absolute path to the current image on your disk
    * `result.equal` — boolean value which is `true` when images are equal and `false` when aren't
    * `result.saveDiffTo` — function is responsible for building diff and present in the `result` only if images aren't equal

* `INTERRUPT` — emitted on signal events `SIGHUP`, `SIGINT` or `SIGTERM`. The event is emitted with 1 argument `data`:
    * `data.exitCode` — exit code with which gemini will be interrupted

* `START_BROWSER` — emitted on browser session start. Emitted with [browser instance](../lib/browser/new-browser.js). If handler returns a promise tests will be executed in this session only after the promise is resolved.

* `STOP_BROWSER` — emitted right before browser session end. Emitted with [browser instance](../lib/browser/new-browser.js). If handler returns a promise quit will be performed only after the promise is resolved.

* `BEGIN` — runner event. Emitted on runner start with 1 argument `data`:
    * `data.suiteCollection` — suite collection which will be run
    * `data.config` — gemini config
    * `data.totalStates` — number of states in collection
    * `data.browserIds` — all browser ids from config
