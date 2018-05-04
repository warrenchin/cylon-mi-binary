/*jshint esversion: 6 */
'use strict';

const should = require('chai')
  .use(require('chai-bytes'))
  .should();

const Packet = require('../lib/packet');

describe('packet', function () {

  let hex = str => Buffer.from(str.replace(/\s+/g, ''), 'hex');

  let token = hex('00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15');
  let payload = hex('01 02 03');
  let raw = hex('21 31 00 23 00 00 00 00 ff ff ff ff ee ee ee ee d1 60 a7 a6 63 d8 35 b0 93 f3 20 7f 49 5f 4c 4a 01 02 03');

  let did = 0xFFFFFFFF;
  let stamp = 0xeeeeeeee;

  it('should pack into correct buffer', function (done) {

    let packet = new Packet(did, token, stamp, payload);
    let output = packet.raw;

    output.should.equalBytes(raw);
    done();
  });

  it('should unpack into correct values', function (done) {
    let packet = Packet.fromRaw(raw);

    packet.did.should.equal(did);
    packet.stamp.should.equal(stamp);
    packet.length.should.equal(0x20 + payload.byteLength);
    packet.payload.should.equalBytes(payload);
    done();
  });

  it('hello should be correct', done => {
    let raw = Packet.hello();
    raw.should.equalBytes(hex('21 31 00 20 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff'));
    done();
  });
});
