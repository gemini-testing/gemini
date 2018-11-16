# Gemini events

Events are listed in order they are emitted.

<table>
<tr>
<th>Event</th>
<th>Description</th>
</tr>

<tr>
<td><code>CLI</code></td>
<td>
Emitted right at start, before cli is parsed. Allows to add new commands and extend help message.
Event is emitted with 1 argument <code>parser</code> which is the
<a href="https://github.com/tj/commander.js">commander</a>
instance used inside gemini itself.
</td>
</tr>

<tr>
<td><code>INIT</code></td>
<td>
Emitted before any job start (<code>test</code>, <code>update</code> or <code>readTests</code>).
If handler returns a promise, then job will start only after the promise is resolved.
Emitted only once no matter how many times job is performed.
</td>
</tr>

<tr>
<td><code>BEFORE_FILE_READ</code></td>
<td>
Emitted before each test file is read. Event is emitted with 1 argument <code>filePath</code>,
which is the absolute path to the file to be read.
</td>
</tr>

<tr>
<td><code>AFTER_FILE_READ</code></td>
<td>
Emitted after each test file has been read. Event is emitted with 1 argument <code>filePath</code>
which is the absolute path to the file that was read.
</td>
</tr>

<tr>
<td><code>AFTER_TESTS_READ</code></td>
<td>
Emitted after all tests were read (during <code>test</code>, <code>update</code> or <code>readTests</code> call).
Event is emitted with 1 argument <code>data</code>:
<pre>
{
    suiteCollection // suite collection with all suites parsed from test files
}
</pre>
</td>
</tr>

<tr>
<td><code>START_RUNNER</code></td>
<td>
Emitted before the start of <code>test</code> or <code>update</code> command.
If you return a promise from the event handler, the start of the command will be delayed until the promise resolves.
</td>
</tr>

<tr>
<td><code>BEGIN</code></td>
<td>
Runner event. Emitted on runner start with 1 argument <code>data</code>:
<pre>
{
    suiteCollection, // suite collection which will be run
    config,          // gemini config
    totalStates,     // number of states in collection
    browserIds       // all browser ids from config
}
</pre>
</td>
</tr>

<tr>
<td><code>BEGIN_SUITE</code></td>
<td>
Emitted before decide if should test suite in specified browser. Event is emitted with 1 argument <code>data</code>:
<pre>
{
    suite,
    browserId
}
</pre>
</td>
</tr>

<tr>
<td><code>SKIP_STATE</code></td>
<td>
Emitted if browser is skipped in this state. Event is emitted with 1 argument <code>data</code>:
<pre>
{
    suite,
    state,
    browserId
}
</pre>
</td>
</tr>

<tr>
<td><code>START_BROWSER</code></td>
<td>
Emitted on browser session start. Emitted with
<a href="../lib/browser/new-browser.js">browser instance</a>.
If handler returns a promise, tests will be executed in this session only after the promise is resolved.
</td>
</tr>

<tr>
<td><code>BEGIN_STATE</code></td>
<td>
Emitted before launching browser for test. Event is emitted with 1 argument <code>data</code>:
<pre>
{
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>UPDATE_RESULT</code></td>
<td>
Emitted always during update. Event is emitted with 1 argument <code>result</code>:
<pre>
{
    refImg,    // reference image info which includes absolute path and size (width, height)
    updated,   // shows if reference image has been changed
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>RETRY</code></td>
<td>
Emitted if test has failed but <b>there is still number of retries left</b>.
Event is emitted with 1 argument <code>result</code>:
<pre>
{
    refImg,        // reference image info which includes absolute path and size (width, height)
    currImg,       // current image info which includes absolute path and size (width, height)
    equal,         // always <i>false</i> for retries
    tolerance,     // specified for current test or globally in <i>.gemini.js</i>
    saveDiffTo,    /* function responsible for building <i>diff</i> and <i>present</i>
                      in the <i>result</i> only if images aren't equal */
    attempt,       // number of retry for browser in current test
    retriesLeft,   /* number of left retries > 0, when number hits 0
                      event <i>TEST_RESULT</i> is called instead */
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>TEST_RESULT</code></td>
<td>
Emitted always after the test is completed. Event is emitted with 1 argument <code>result</code>:
<pre>
{
    refImg,        // reference image info which includes absolute path and size (width, height)
    currImg,       // current image info which includes absolute path and size (width, height)
    equal,         // shows if images are equal
    tolerance,     // specified for current test or globally in <i>.gemini.js</i>
    saveDiffTo,    /* function responsible for building <i>diff</i> and <i>present</i>
                      in the <i>result</i> only if images aren't equal */
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>END_STATE</code></td>
<td>
Emitted right after <code>UPDATE_RESULT</code> and <code>TEST_RESULT</code> with 1 argument <code>data</code>:
<pre>
{
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>STOP_BROWSER</code></td>
<td>
Emitted right before browser session end. Emitted with
<a href="../lib/browser/new-browser.js">browser instance</a>.
If handler returns a promise, quit will be performed only after the promise is resolved.
</td>
</tr>

<tr>
<td><code>END_SUITE</code></td>
<td>
Emitted right after suite is skipped or tested in specified browser. Emitted with 1 argument <code>data</code>:
<pre>
{
    suite,     // tested suite
    browserId, // skipped or tested browser
}
</pre>
</td>
</tr>

<tr>
<td><code>ERROR</code></td>
<td>
Emitted with 1 argument <code>err</code>, which is an instance of <code>Error</code>
and has additional fields depending on the cause of error.

For example, if <i>Reference image is missing</i>, <code>err</code> will have additional fields:

<pre>
{
    refImg,
    currImg,
    suite,
    state,
    browserId,
    sessionId
}
</pre>
</td>
</tr>

<tr>
<td><code>INTERRUPT</code></td>
<td>
Emitted on signal events <code>SIGHUP</code>, <code>SIGINT</code> or <code>SIGTERM</code>.
The event is emitted with 1 argument <code>data – {exitCode}</code>, wich is
<ul>
<li> 129 for <code>SIGHUP</code>
<li> 130 for <code>SIGINT</code>
<li> 143 for <code>SIGTERM</code>
</ul>
</td>
</tr>

<tr>
<td><code>END</code></td>
<td>
Emitted when all tests are completed with 1 argument <code>stat</code>, which contains statistics for tests.

For example:

<pre>
{
    total: 6,
    updated: 0,
    passed: 2,
    failed: 1,
    skipped: 3,
    retries: 8
}
</pre>
</td>
</tr>

<tr>
<td><code>END_RUNNER</code></td>
<td>
Emitted after the end of the <code>test</code> or <code>update</code> command.
</td>
</tr>

</table>
