var q = require('q'),
    inherit = require('inherit');

function nothing() {
    return q.resolve();
}

var Plan = module.exports = inherit({
    __constructor: function() {
        this._states = {};
    },

    setName: function setName(name) {
        this.name = name;
        return this;
    },

    setElement: function setElement(selector) {
        this.selector = selector;
        return this;
    },

    setUrl: function setUrl(newUrl) {
        this.url = newUrl;
        return this;
    },

    addState: function state(name, cb) {
        cb = cb || nothing;
        this._states[name] = cb;
        return this;
    },

    getStates: function getStates() {
        return Object.keys(this._states);
    },

    toState: function toState(name, element, page) {
        return this._states[name].call(this, element, page);
    }

}, {
    read: function(file) {
        var plan = new Plan();
        require(file)(plan);
        return plan;
    }
});
