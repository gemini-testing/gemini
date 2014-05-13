'use strict';
var Config = require('../lib/config');

describe('config', function() {
    describe('capabilities', function() {

        it('should be copied as is', function() {
            var config = new Config('/', [
                'rootUrl: http://example.com',
                'gridUrl: http://example.com',
                'capabilities:',
                '  option: value',
                '  option2: other value'
            ].join('\n'));

            config.capabilities.must.eql({
                option: 'value',
                option2: 'other value'
            });
        });

        function shouldNotAllowCapability(name) {
            it('should not allow set `' + name + '` capability', function() {
                (function() {
                    return new Config('/', [
                        'rootUrl: http://example.com',
                        'gridUrl: http://example.com',
                        'capabilities:',
                        '  ' + name + ': value'
                    ].join('\n'));
                }.must.throw());
            });
        }

        shouldNotAllowCapability('browserName');
        shouldNotAllowCapability('version');
        shouldNotAllowCapability('takesScreenshot');
    });
});
