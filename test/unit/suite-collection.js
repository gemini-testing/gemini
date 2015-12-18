'use strict';

var SuiteCollection = require('../../lib/suite-collection'),
    util = require('../util'),
    format = require('util').format;

describe('suite-collection', function() {
    describe('topLevelSuites', function() {
        it('should return empty list on empty collection', function() {
            var collection = new SuiteCollection();
            assert.deepEqual([], collection.topLevelSuites());
        });

        it('should return all suites from collection', function() {
            var collection = new SuiteCollection(),
                suite1 = util.makeSuiteStub(),
                suite2 = util.makeSuiteStub();

            collection
                .add(suite1)
                .add(suite2);

            assert.deepEqual(
                [suite1, suite2],
                collection.topLevelSuites()
            );
        });

        it('should return only top level suites', function() {
            var collection = new SuiteCollection(),
                root = util.makeSuiteStub();

            util.makeSuiteStub({parent: root});

            collection.add(root);

            assert.deepEqual(
                [root],
                collection.topLevelSuites()
            );
        });
    });

    describe('allSuites', function() {
        it('should return empty list on empty collection', function() {
            var collection = new SuiteCollection();
            assert.deepEqual([], collection.allSuites());
        });

        it('should return all suites including children', function() {
            var collection = new SuiteCollection(),
                root = util.makeSuiteStub(),
                child = util.makeSuiteStub({parent: root}),
                grandchild1 = util.makeSuiteStub({parent: child}),
                grandchild2 = util.makeSuiteStub({parent: child});

            collection.add(root);

            assert.deepEqual(
                [root, child, grandchild1, grandchild2],
                collection.allSuites()
            );
        });
    });

    describe('disableAll', function() {
        it('should disable all suites', function() {
            var root = util.makeSuiteStub({name: 'root'}),
                child = util.makeSuiteStub({parent: root, name: 'child'}),
                collection = new SuiteCollection([root]);

            collection.disableAll();

            assertDisabled(root);
            assertDisabled(child);
        });
    });

    describe('disable', function() {
        it('should disable only passed suite and its subtree', function() {
            var root = util.makeSuiteStub({name: 'root'}),
                child = util.makeSuiteStub({parent: root, name: 'child'}),
                grandchild = util.makeSuiteStub({parent: child, name: 'grandchild'}),
                collection = new SuiteCollection([root]);

            collection.disable(child);

            assertEnabled(root);
            assertDisabled(child);
            assertDisabled(grandchild);
        });

        it('should disable subtree even if it was enabled', function() {
            var root = util.makeSuiteStub({name: 'root'}),
                child = util.makeSuiteStub({parent: root, name: 'child'}),
                grandchild = util.makeSuiteStub({parent: child, name: 'grandchild'}),
                collection = new SuiteCollection([root]);

            collection.enableAll();
            collection.disable(child);

            assertEnabled(root);
            assertDisabled(child);
            assertDisabled(grandchild);
        });

        it('should disable only specified state', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                someState = util.makeStateStub(suite, {name: 'some-state'}),
                otherState = util.makeStateStub(suite, {name: 'other-state'});

            collection.disable(suite, {state: 'some-state'});

            assertDisabled(suite, someState);
            assertEnabled(suite, otherState);
        });

        it('should apply all disable rules', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                someState = util.makeStateStub(suite, {name: 'some-state'}),
                otherState = util.makeStateStub(suite, {name: 'other-state'});

            collection
                .disable(suite, {state: 'some-state'})
                .disable(suite, {state: 'other-state'});

            assertDisabled(suite, someState);
            assertDisabled(suite, otherState);
        });

        it('should state if whole suite was disabled', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                someState = util.makeStateStub(suite, {name: 'some-state'});

            collection.disable(suite);

            assertDisabled(suite, someState);
        });

        it('should disable only specified state in specified browser', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                state = util.makeStateStub(suite, {name: 'some-state'});

            collection.disable(suite, {state: 'some-state', browser: 'ie9'});

            assertDisabled(suite, state, 'ie9');
            assertEnabled(suite, state, 'firefox');
        });
    });

    describe('enableAll', function() {
        it('should enable all suites', function() {
            var root = util.makeSuiteStub({name: 'root'}),
                child = util.makeSuiteStub({parent: root, name: 'child'}),
                collection = new SuiteCollection([root]);

            collection.enableAll();

            assertEnabled(root);
            assertEnabled(child);
        });
    });

    describe('enable', function() {
        it('should enable only passed suite and its subtree', function() {
            var root = util.makeSuiteStub({name: 'root'}),
                child = util.makeSuiteStub({parent: root, name: 'child'}),
                grandchild = util.makeSuiteStub({parent: child, name: 'grandchild'}),
                collection = new SuiteCollection([root]);

            collection
                .disableAll()
                .enable(child);

            assertDisabled(root);
            assertEnabled(child);
            assertEnabled(grandchild);
        });

        it('should enable only specified state', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                someState = util.makeStateStub(suite, {name: 'some-state'}),
                otherState = util.makeStateStub(suite, {name: 'other-state'});

            collection
                .disableAll()
                .enable(suite, {state: 'some-state'});

            assertEnabled(suite, someState);
            assertDisabled(suite, otherState);
        });

        it('should apply all enable rules', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                someState = util.makeStateStub(suite, {name: 'some-state'}),
                otherState = util.makeStateStub(suite, {name: 'other-state'});

            collection
                .disableAll()
                .enable(suite, {state: 'some-state'})
                .enable(suite, {state: 'other-state'});

            assertEnabled(suite, someState);
            assertEnabled(suite, otherState);
        });

        it('should enable only specified state in specified browser', function() {
            var suite = util.makeSuiteStub(),
                collection = new SuiteCollection([suite]),
                state = util.makeStateStub(suite, {name: 'some-state'});

            collection
                .disableAll()
                .enable(suite, {state: 'some-state', browser: 'ie9'});

            assertEnabled(suite, state, 'ie9');
            assertDisabled(suite, state, 'firefox');
        });
    });
});

function assertEnabled(suite, state, browser) {
    assert.isFalse(
        Boolean(suite.isDisabled) && suite.isDisabled(browser, state),
        toStr(suite, state, browser) + ' should be enabled'
    );
}

function assertDisabled(suite, state, browser) {
    assert.isTrue(
        suite.isDisabled(browser, state),
        toStr(suite, state, browser) + ' should be disabled'
    );
}

function toStr(suite, state, browser) {
    var msg = format('suite `%s`', suite.name);
    if (state) {
        msg = format('state `%s` of %s', state.name, msg);
    }
    if (browser) {
        msg = format('%s in browser `%s`', msg, browser);
    }
    return msg;
}
