/*jshint esversion: 6 */

const should = require('chai')
  .use(require('chai-bytes'))
  .should();

const MiioInterface = require('../lib/interface');

describe('packet', function () {
  it('should', function (done) {
    process.env['DEBUG'] = '*';

    this.timeout(0);

    const miio = new MiioInterface();
    miio.start();

    //done();
  });

});