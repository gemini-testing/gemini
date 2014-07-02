'use strict';
var sinon = require('sinon'),
    q = require('q'),
    Browser = require('../lib/browser'),
    Config = require('../lib/config'),
    BrowserLauncher = require('../lib/browser/launcher.js');

describe('BrowserLauncher', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.sinon.stub(Browser.prototype, 'launch').returns(q());
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should launch a browser with given name', function() {
        var config = sinon.createStubInstance(Config);
        config.browsers = {
            'some-id': {
                browserName: 'name'
            }
        };

        var launcher = new BrowserLauncher(config);
        return launcher.launch('some-id').then(function(browser) {
            browser.must.be.instanceOf(Browser);
            browser.id.must.be('some-id');
            browser.config.must.be(config);
            browser.browserName.must.be('name');
            sinon.assert.calledOn(Browser.prototype.launch, browser);
        });
    });

    it('should close browser when called stop()', function() {
        var launcher = new BrowserLauncher({}),
            browser = new Browser({}, 'name', {});

        this.sinon.stub(browser, 'quit').returns(q());

        return launcher.stop(browser).then(function() {
            sinon.assert.called(browser.quit);
        });
    });

    describe('with parallelLimit', function() {
        function launcherWithLimit(limit) {
            var config = sinon.createStubInstance(Config);
            config.parallelLimit = limit;
            config.browsers = {};

            return new BrowserLauncher(config);
        }

        it('should launch all browser in limit', function() {
            var launcher = launcherWithLimit(2);
            return q.all([launcher.launch('first'), launcher.launch('second')]);
        });

        it('should not launch browsers out of limit', function(done) {
            var launcher = launcherWithLimit(1);
            return launcher.launch('first')
                .then(function() {
                    return launcher.launch('second').timeout(100, 'timeout');
                })
                .fail(function(e) {
                    e.message.must.be('timeout');
                    done();
                });
        });

        it('should launch next browsers after previous are released', function() {
            var _this = this,
                launcher = launcherWithLimit(1);
            return launcher.launch('first')
                .then(function(browser) {
                    _this.sinon.stub(browser, 'quit').returns(q());
                    return launcher.stop(browser);
                })
                .then(function() {
                    return launcher.launch('second');
                });
        });

        it('should launch queued browser when previous are released', function() {
            var _this = this,
                launcher = launcherWithLimit(1);
            return launcher.launch('first')
                .then(function(browser) {
                    var secondPromise = launcher.launch('second');
                    _this.sinon.stub(browser, 'quit').returns(q());
                    return q.delay(100)
                        .then(function() {
                            return launcher.stop(browser);
                        })
                        .then(function() {
                            return secondPromise;
                        });
                });
        });
    });
});
