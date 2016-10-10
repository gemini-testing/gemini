'use strict';
const wd = require('wd');
const _ = require('lodash');
const Promise = require('bluebird');
const EventEmitter = require('events').EventEmitter;

function isPromised(methodName) {
    if (Object.prototype[methodName]) {
        return false;
    }

    if (EventEmitter.prototype[methodName]) {
        return false;
    }

    return true;
}

function wrap(propertyName, original) {
    if (_.isFunction(original[propertyName])) {
        if (isPromised(propertyName)) {
            return wrapPromised(propertyName, original);
        }

        return original[propertyName].bind(original);
    }
    return original[propertyName];
}

function wrapPromised(methodName, original) {
    return function() {
        return Promise.resolve(original[methodName].apply(original, arguments));
    };
}

exports.promiseRemote = (gridUrl) => {
    const remote = wd.promiseRemote(gridUrl);
    const bluebirdRemote = {};

    for (let prop in remote) {
        bluebirdRemote[prop] = wrap(prop, remote);
    }
    return bluebirdRemote;
};
