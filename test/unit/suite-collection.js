'use strict';

var SuiteCollection = require('../../src/suite-collection'),
    mkTree = require('../util').makeSuiteTree;

describe('suite-collection', function() {
    describe('topLevelSuites', function() {
        it('should return empty list on empty collection', function() {
            var collection = new SuiteCollection();
            assert.deepEqual([], collection.topLevelSuites());
        });

        it('should return all suites from collection', function() {
            var tree = mkTree({
                    suite1: [],
                    suite2: []
                }),
                collection = new SuiteCollection();

            collection
                .add(tree.suite1)
                .add(tree.suite2);

            assert.deepEqual(
                [tree.suite1, tree.suite2],
                collection.topLevelSuites()
            );
        });

        it('should return only top level suites', function() {
            var tree = mkTree({
                    parent: {
                        child: []
                    }
                }),
                collection = new SuiteCollection();

            collection.add(tree.parent);

            assert.deepEqual(
                [tree.parent],
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
            var tree = mkTree({
                    parent: {
                        child: {
                            grandchild1: [],
                            grandchild2: []
                        }
                    }
                }),
                collection = new SuiteCollection();

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

    describe('enable/disable', function() {
        it('all tests should be enabled by default', function() {
            var tree = mkTree({
                    parent: {
                        child: ['state1', 'state2']
                    }
                }, {browsers: ['b1', 'b2']});

            assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.state1.browsers, ['b1', 'b2']);
            assert.deepEqual(tree.state2.browsers, ['b1', 'b2']);
        });

        describe('disableAll', function() {
            it('should disable all suites', function() {
                var tree = mkTree({
                        parent: {
                            child: []
                        }
                    });

                new SuiteCollection([tree.parent])
                    .disableAll();

                assert.deepEqual(tree.parent.browsers, []);
                assert.deepEqual(tree.child.browsers, []);
            });

            it('should not disable parent suite if it not in collection', function() {
                var tree = mkTree({
                        parent: {
                            child: []
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.child])
                    .disableAll();

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
            });

            it('should disable all suites after enable', function() {
                var tree = mkTree({
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

        describe('disable', function() {
            it('should disable only passed suite and its subtree', function() {
                var tree = mkTree({
                        parent: {
                            child: {
                                grandchild: []
                            }
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disable(tree.child);

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, []);
                assert.deepEqual(tree.grandchild.browsers, []);
            });

            it('should disable suite by full name', function() {
                var tree = mkTree({
                        parent: {
                            child: []
                        }
                    });

                new SuiteCollection([tree.parent])
                    .disable(tree.child.fullName);

                assert.deepEqual(tree.child.browsers, []);
            });

            it('should fail on attempt to disable unknown suite', function() {
                var tree = mkTree({
                        suite: []
                    }),
                    collection = new SuiteCollection([tree.suite]);

                assert.throws(function() {
                    collection.disable('some bad suite');
                }, /Unknown/);
            });

            it('should disable whole subtree including states', function() {
                var tree = mkTree({
                        parent: {
                            child1: ['state1'],
                            child2: ['state2', 'state3']
                        }
                    });

                new SuiteCollection([tree.parent])
                    .disable(tree.parent);

                assert.deepEqual(tree.parent.browsers, []);
                assert.deepEqual(tree.child1.browsers, []);
                assert.deepEqual(tree.child2.browsers, []);
                assert.deepEqual(tree.state1.browsers, []);
                assert.deepEqual(tree.state2.browsers, []);
                assert.deepEqual(tree.state3.browsers, []);
            });

            it('should disable subtree even if it was enabled', function() {
                var tree = mkTree({
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

            it('should disable only specified state', function() {
                var tree = mkTree({
                        suite: ['someState', 'otherState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disable(tree.suite, {state: 'someState'});

                assert.deepEqual(tree.someState.browsers, []);
                assert.deepEqual(tree.otherState.browsers, ['b1', 'b2']);
            });

            it('should fail to disable unknown state', function() {
                var tree = mkTree({
                        suite: ['someState']
                    }),
                    collection = new SuiteCollection([tree.suite]);

                assert.throws(function() {
                    collection.disable(tree.suite, {state: 'otherState'});
                }, /No such state/);
            });

            it('should not disable whole tree down to disabled state', function() {
                var tree = mkTree({
                        parent: {
                            child: ['someState']
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disable(tree.child, {state: 'someState'});

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should apply all disable rules', function() {
                var tree = mkTree({
                        suite: ['someState', 'otherState']
                    });

                new SuiteCollection([tree.suite])
                    .disable(tree.suite, {state: 'someState'})
                    .disable(tree.suite, {state: 'otherState'});

                assert.deepEqual(tree.someState.browsers, []);
                assert.deepEqual(tree.otherState.browsers, []);
            });

            it('should disable only specified state in specified browser', function() {
                var tree = mkTree({
                        suite: ['someState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b2']);
            });

            it('should apply browser rule to whole tree', function() {
                var tree = mkTree({
                        parent: {
                            child1: ['state1'],
                            child2: ['state2', 'state3']
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disable(tree.parent, {browser: 'b1'});

                assert.deepEqual(tree.parent.browsers, ['b2']);
                assert.deepEqual(tree.child1.browsers, ['b2']);
                assert.deepEqual(tree.child2.browsers, ['b2']);
                assert.deepEqual(tree.state1.browsers, ['b2']);
                assert.deepEqual(tree.state2.browsers, ['b2']);
                assert.deepEqual(tree.state3.browsers, ['b2']);
            });
        });

        describe('enableAll', function() {
            it('should enable all suites', function() {
                var tree = mkTree({
                        parent: {
                            child: []
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .enableAll();

                assert.deepEqual(tree.parent.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should enable all suites after disable', function() {
                var tree = mkTree({
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

        describe('enable', function() {
            it('should enable suite by full name', function() {
                var tree = mkTree({
                        parent: {
                            child: []
                        }
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.parent])
                    .disableAll()
                    .enable(tree.child.fullName);

                assert.deepEqual(tree.child.browsers, ['b1', 'b2']);
            });

            it('should fail on attempt to enable unknown suite', function() {
                var tree = mkTree({
                        suite: []
                    }),
                    collection = new SuiteCollection([tree.suite]);

                assert.throws(function() {
                    collection.enable('some bad suite');
                }, /Unknown/);
            });

            it('should enable only specified state', function() {
                var tree = mkTree({
                        suite: ['someState', 'otherState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState'});

                assert.deepEqual(tree.someState.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.otherState.browsers, []);
            });

            it('should apply all enable rules', function() {
                var tree = mkTree({
                        suite: ['someState', 'otherState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState'})
                    .enable(tree.suite, {state: 'otherState'});

                assert.deepEqual(tree.someState.browsers, ['b1', 'b2']);
                assert.deepEqual(tree.otherState.browsers, ['b1', 'b2']);
            });

            it('should enable only specified state in specified browser', function() {
                var tree = mkTree({
                        suite: ['someState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b1']);
            });

            it('should apply all browser enable rules', function() {
                var tree = mkTree({
                        suite: ['someState']
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .disableAll()
                    .enable(tree.suite, {state: 'someState', browser: 'b2'})
                    .enable(tree.suite, {state: 'someState', browser: 'b1'});

                assert.deepEqual(tree.someState.browsers, ['b2', 'b1']);
            });

            it('should enable whole tree down to enabled state', function() {
                var tree = mkTree({
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

            it('should be able to enable in some unknown browser', function() {
                var tree = mkTree({
                        suite: []
                    }, {browsers: ['b1', 'b2']});

                new SuiteCollection([tree.suite])
                    .enable(tree.suite, {browser: 'b3'});

                assert.deepEqual(tree.suite.browsers, ['b1', 'b2', 'b3']);
            });

            it('should not remove new browser on second enable', function() {
                var tree = mkTree({
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
});
