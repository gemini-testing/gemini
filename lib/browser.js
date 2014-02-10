var q = require('q'),
    inherit = require('inherit'),
    webdriver = require('selenium-webdriver'),
    Image = require('./image'),
    By = webdriver.By;

function wdToQ(wdPromise) {
    return wdPromise;
    //var d = q.defer();
    //wdPromise.then(
        //function() {
            //console.log('here', '123');
            //console.log(arguments);
            //d.resolve.apply(d, arguments);
        //},

        //function() {
            //console.log('here', '456');
            //d.reject.apply(d, arguments);
        //}
    //);
    //return d.promise;
}

module.exports = inherit({
    __constructor: function() {
        this._driver = new webdriver.Builder().
           withCapabilities(webdriver.Capabilities.chrome()).
           build();
    },

    open: function(url) {
        return wdToQ(this._driver.get(url));
    },

    findElement: function(selector) {
        return wdToQ(this._driver.findElement(By.css(selector)));
    },

    takeScreenshot: function() {
        return wdToQ(this._driver.takeScreenshot())
            .then(function (base64) {
                return new Image(new Buffer(base64, 'base64'));
            });
    },

    quit: function() {
        return this._driver.quit();
    }

});
