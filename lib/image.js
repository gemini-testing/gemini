var q = require('q'),
    gm = require('gm'),
    inherit = require('inherit');

module.exports = inherit({
    __constructor: function(buffer) {
        this._gm = gm(buffer);
    },

    crop: function crop(rect) {
        this._gm.crop(rect.width, rect.height, rect.x, rect.y);
        return q.resolve(this);
    },

    save: function save(file) {
        var d = q.defer();
        this._gm.write(file, function(error) {
            if (error) {
                return d.reject(error);
            }
            d.fulfill(file);
        });
        return d.promise;
    }
});
