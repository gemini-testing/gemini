var chai = require('chai'),
    sinon = require('sinon');

chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, {prefix: ''});
