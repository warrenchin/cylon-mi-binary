/*jshint esversion: 6 */

const should = require('chai')
  .use(require('chai-bytes'))
  .should();

const Adaptor = require('../lib/adaptor');
const Driver = require('../lib/driver');

describe('adaptor', function () {
  it('should work', function (done) {
    let adaptor = new Adaptor();
    let driver = new Driver();
    done();
  });
});