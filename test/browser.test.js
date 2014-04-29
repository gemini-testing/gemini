'use strict';
var Browser = require('../lib/browser'),
    q = require('q'),
    wd = require('wd'),
    Element = require('../lib/browser/element'),
    elementRect = require('../lib/element-rect'),
    sinon = require('sinon');

describe('browser', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
    });

    afterEach(function() {
        this.sinon.restore();
    });

    describe('captureState', function() {
        beforeEach(function() {
            this.wd = {
                takeScreenshot: sinon.stub().returns(q('')),
                elementByCssSelector: sinon.stub().returns(q({}))
            };
            this.sinon.stub(wd, 'promiseRemote').returns(this.wd);

            this.browser = new Browser({}, 'browser', '1.0');

            this.state = {
                captureSelectors: ['.some-class'],
                activate: sinon.stub().returns(q())
            };

            this.sinon.stub(elementRect, 'getMultiple').returns(q({x: 0, y: 0, width: 0, height: 0}));
        });

        it('should activate the state', function() {
            var _this = this;
            return this.browser.captureState(this.state).then(function() {
                sinon.assert.calledWith(_this.state.activate, _this.browser);
            });
        });

        it('should take the screenshot', function() {
            var _this = this;

            return this.browser.captureState(this.state).then(function() {
                sinon.assert.called(_this.wd.takeScreenshot);
            });
        });

        it('should search state captureSelectors', function() {
            var _this = this;
            this.state.captureSelectors = ['.selector1', '.selector2'];

            return this.browser.captureState(this.state).then(function() {
                sinon.assert.calledWith(_this.wd.elementByCssSelector, '.selector1');
                sinon.assert.calledWith(_this.wd.elementByCssSelector, '.selector2');
            });
        });

        it('should search rect for all found elements', function() {
            this.state.captureSelectors = ['.selector1', '.selector2'];
            this.wd.elementByCssSelector.withArgs('.selector1').returns(q());
            this.wd.elementByCssSelector.withArgs('.selector2').returns(q());

            return this.browser.captureState(this.state).then(function() {
                sinon.assert.calledWith(elementRect.getMultiple, sinon.match([
                    sinon.match.instanceOf(Element).and(sinon.match.has('selector', '.selector1')),
                    sinon.match.instanceOf(Element).and(sinon.match.has('selector', '.selector2')),
                ]));
            });
        });

        it('should crop screenshot to returened rect');
    });
});
