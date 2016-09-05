'use strict';

const proxyquire = require('proxyquire');
const mkTree = require('../util').makeSuiteTree;

describe('suite-collection', () => {
    const sandbox = sinon.sandbox.create();

    let SuiteBuilder;
    let SuiteCollection;

    beforeEach(() => {
        SuiteBuilder = sandbox.stub();
        SuiteCollection = proxyquire('lib/suite-collection', {
            './tests-api/suite-builder': SuiteBuilder
        });
    });

    afterEach(() => sandbox.restore());

    describe('topLevelSuites', () => {
        it('should return empty list on empty collection', () => {
            const collection = new SuiteCollection();

            assert.deepEqual([], collection.topLevelSuites());
        });

        it('should return all suites from collection', () => {
            const tree = mkTree({
                suite1: [],
                suite2: []
            });
            const collection = new SuiteCollection();

            collection
                .add(tree.suite1)
                .add(tree.suite2);

            assert.deepEqual([tree.suite1, tree.suite2], collection.topLevelSuites());
        });

        it('should return only top level suites', () => {
            const tree = mkTree({
                parent: {
                    child: []
                }
            });
            const collection = new SuiteCollection();

            collection.add(tree.parent);

            assert.deepEqual([tree.parent], collection.topLevelSuites());
        });
    });

    describe('clone method', () => {
        it('should leave top level parent for each tl suite', () => {
            const tree = mkTree({
                parent: {
                    child: []
                }
            });

            const collection = new SuiteCollection([tree.child]);
            const clonedCollection = collection.clone();
            const clonedChild = clonedCollection.topLevelSuites()[0];

            assert.equal(clonedChild.parent, tree.child.parent);
        });

        it('should not add new children to top level parent', () => {
            const tree = mkTree({
                parent: {
                    child: []
                }
            });

            const collection = new SuiteCollection([tree.child]);
            const clonedCollection = collection.clone();

            assert.lengthOf(clonedCollection.topLevelSuites()[0].parent.children, 1);
        });

        it('should return new suite collection', () => {
            const collection = new SuiteCollection();
            const clonedCollection = collection.clone();

            assert.notEqual(clonedCollection, collection);
        });

        it('should clone all suites from the collection', () => {
            const tree = mkTree({suite: []});
            const collection = new SuiteCollection([tree.suite]);
            sandbox.stub(tree.suite, 'clone');
            collection.clone();

            assert.calledOnce(collection.topLevelSuites()[0].clone);
        });
    });

    describe('allSuites', () => {
        it('should return empty list on empty collection', () => {
            const collection = new SuiteCollection();

            assert.deepEqual([], collection.allSuites());
        });

        it('should return all suites including children', () => {
            const tree = mkTree({
                parent: {
                    child: {
                        grandchild1: [],
                        grandchild2: []
                    }
                }
            });
            const collection = new SuiteCollection();

            collection.add(tree.parent);

            assert.deepEqual(
                [
                    tree.parent,
                    tree.child,
                    tree.grandchild1,
                    tree.grandchild2
                ],
                collection.allSuites()
            );
        });
    });

    describe('enable/disable', () => {
        it('all tests should be enabled by default', () => {
            const tree = mkTree({
                parent: {
                    child: ['state1', 'state2']
                }
            }, {browsers: ['b1', 'b2']});

            assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.state1.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.state2.browsers, ['b1', 'b2']);
        });

        describe('disableAll', () => {
            it('should disable all suites', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                });

                new SuiteCollection([tree.parent]).disableAll();

                assert.deepEqual(tree.parent.browsers, []);
                assert.deepEqual(tree.child.browsers, []);
            });

            it('should not disable parent suite if it not in collection', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.child]).disableAll();

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
            });

            it('should disable all suites after enable', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                });

                new SuiteCollection([tree.parent])
                    .enableAll()
                    .disableAll();

                assert.deepEqual(tree.parent.browsers, []);
                assert.deepEqual(tree.child.browsers, []);
            });
        });

        describe('disable', () => {
            it('should disable only passed suite and its subtree', () => {
                const tree = mkTree({
                    parent: {
                        child: {
                            grandchild: []
                        }
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent]).disable(tree.child);

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, []);
                assert.deepEqual(tree.grandchild.browsers, []);
            });

            it('should disable suite by full name', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                });

                new SuiteCollection([tree.parent]).disable(tree.child.fullName);

                assert.deepEqual(tree.child.browsers, []);
            });

            it('should fail on attempt to disable unknown suite', () => {
                const tree = mkTree({
                    suite: []
                });
                const collection = new SuiteCollection([tree.suite]);

                assert.throws(() => {
                    collection.disable('some bad suite');
                }, /Unknown/);
            });

            it('should disable whole subtree including states', () => {
                const tree = mkTree({
                    parent: {
                        child1: ['state1'],
                        child2: ['state2', 'state3']
                    }
                });

                new SuiteCollection([tree.parent]).disable(tree.parent);

                assert.deepEqual(tree.parent.browsers, []);
                assert.deepEqual(tree.child1.browsers, []);
                assert.deepEqual(tree.child2.browsers, []);
                assert.deepEqual(tree.state1.browsers, []);
                assert.deepEqual(tree.state2.browsers, []);
                assert.deepEqual(tree.state3.browsers, []);
            });

            it('should disable subtree even if it was enabled', () => {
                const tree = mkTree({
                    parent: {
                        child: {
                            grandchild: []
                        }
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .enableAll()
                    .disable(tree.child);

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, []);
                assert.deepEqual(tree.grandchild.browsers, []);
            });

            it('should disable only specified state', () => {
                const tree = mkTree({
                    suite: ['someState', 'otherState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite]).disable(tree.suite, {state: 'someState'});

                assert.deepEqual(tree.someState.browsers, []);
                assert.deepEqual(tree.otherState.browsers, ['b1', 'b2']);
            });

            it('should fail to disable unknown state', () => {
                const tree = mkTree({
                    suite: ['someState']
                });
                const collection = new SuiteCollection([tree.suite]);

                assert.throws(() => {
                    collection.disable(tree.suite, {state: 'otherState'});
                }, /No such state/);
            });

            it('should not disable whole tree down to disabled state', () => {
                const tree = mkTree({
                    parent: {
                        child: ['someState']
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent]).disable(tree.child, {state: 'someState'});

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should apply all disable rules', () => {
                const tree = mkTree({
                    suite: ['someState', 'otherState']
                });

                new SuiteCollection([tree.suite])
                    .disable(tree.suite, {state: 'someState'})
                    .disable(tree.suite, {state: 'otherState'});

                assert.deepEqual(tree.someState.browsers, []);
                assert.deepEqual(tree.otherState.browsers, []);
            });

            it('should disable only specified state in specified browser', () => {
                const tree = mkTree({
                    suite: ['someState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b2']);
            });

            it('should apply browser rule to whole tree', () => {
                const tree = mkTree({
                    parent: {
                        child1: ['state1'],
                        child2: ['state2', 'state3']
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent]).disable(tree.parent, {browser: 'b1'});

                assert.deepEqual(tree.parent.browsers, ['b2']);
                assert.deepEqual(tree.child1.browsers, ['b2']);
                assert.deepEqual(tree.child2.browsers, ['b2']);
                assert.deepEqual(tree.state1.browsers, ['b2']);
                assert.deepEqual(tree.state2.browsers, ['b2']);
                assert.deepEqual(tree.state3.browsers, ['b2']);
            });
        });

        describe('enableAll', () => {
            it('should enable all suites', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent]).enableAll();

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should enable all suites after disable', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disableAll()
                    .enableAll();

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });
        });

        describe('enable', () => {
            it('should enable suite by full name', () => {
                const tree = mkTree({
                    parent: {
                        child: []
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disableAll()
                    .enable(tree.child.fullName);

                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should fail on attempt to enable unknown suite', () => {
                const tree = mkTree({
                    suite: []
                });
                const collection = new SuiteCollection([tree.suite]);

                assert.throws(() => {
                    collection.enable('some bad suite');
                }, /Unknown/);
            });

            it('should enable only specified state', () => {
                const tree = mkTree({
                    suite: ['someState', 'otherState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState'});

                assert.deepEqual(tree.someState.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.otherState.browsers, []);
            });

            it('should apply all enable rules', () => {
                const tree = mkTree({
                    suite: ['someState', 'otherState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState'})
                    .enable(tree.suite, {state: 'otherState'});

                assert.deepEqual(tree.someState.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.otherState.browsers, ['b1', 'b2']);
            });

            it('should enable only specified state in specified browser', () => {
                const tree = mkTree({
                    suite: ['someState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b1']);
            });

            it('should apply all browser enable rules', () => {
                const tree = mkTree({
                    suite: ['someState']
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState', browser: 'b2'})
                    .enable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b2', 'b1']);
            });

            it('should enable whole tree down to enabled state', () => {
                const tree = mkTree({
                    parent: {
                        child: {
                            grandchild: ['someState']
                        }
                    }
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disableAll()
                    .enable(tree.grandchild, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.parent.browsers, ['b1']);
                assert.deepEqual(tree.child.browsers, ['b1']);
                assert.deepEqual(tree.grandchild.browsers, ['b1']);
                assert.deepEqual(tree.someState.browsers, ['b1']);
            });

            it('should be able to enable in some unknown browser', () => {
                const tree = mkTree({
                    suite: []
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite]).enable(tree.suite, {browser: 'b3'});

                assert.deepEqual(tree.suite.browsers, ['b1', 'b2', 'b3']);
            });

            it('should not remove new browser on second enable', () => {
                const tree = mkTree({
                    suite: []
                }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {browser: 'b3'})
                    .enable(tree.suite);

                assert.deepEqual(tree.suite.browsers, ['b3', 'b1', 'b2']);
            });
        });
    });

    describe('skip browsers by SuiteBuilder', () => {
        let skip;

        beforeEach(() => {
            skip = sandbox.stub();

            SuiteBuilder.returns({skip});
        });

        it('should skip passed browsers', () => {
            const tree = mkTree({
                suite: []
            }, {browsers: ['b1', 'b2']});

            new SuiteCollection([tree.suite]).skipBrowsers(tree.suite.browsers);

            assert.calledWith(skip, ['b1', 'b2'],
                'The test was skipped by environment variable GEMINI_SKIP_BROWSERS');
        });
    });
});
