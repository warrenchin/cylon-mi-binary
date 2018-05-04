/*jshint esversion: 6, -W116, -W035 */

const crypto = require('crypto');

// https://github.com/GammaRay360/mihome-binary-protocol/blob/master/doc/PROTOCOL.md
//
//         0               1               2               3
//         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
//        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+------
//     0  | Magic number = 0x2131          | Packet Length (incl. header) |    ↑
//        |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|    |
//     4  | Unknown1                                                      |    |
//        |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|    |
//     8  | Device ID ("did")                                             |    |
//        |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|    |
//    12  | Time Stamp                                                    |  Header
//        |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|    |
//    16  | MD5 checksum.                                                 |    |
//    20  | OR                                                            |    |
//    24  | Device Token in response to the "Hello" packet.               |    |
//    28  | size = 16 bytes.                                              |    ↓
//        |-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-|------
//    32  | optional, variable-sized data                                 |    ↑
//     ⋮   ⋮ max size = 65503 bytes (0xffff - header size).                ⋮  Payload
//    n-1 | encrypted with AES-128 (see below).                           |    ↓
//     n  |...............................................................|------

class Packet {
  constructor(did = 0, token = null, stamp = 0, payload = null) {
    this.did = did;
    this.token = token;
    this.stamp = stamp;
    this.payload = payload;

    this.length = 0;
    //this.unknow1 = 0;
    this.md5 = null;
  }

  static fromRaw(raw) {
    let packet = new Packet();
    packet.raw = raw;
    return packet;
  }

  static hello() {
    let header = Buffer.alloc(32, 0xff);
    header.writeUInt16BE(0x2131, 0);
    header.writeUInt16BE(0x20, 2);
    return header;
  }

  set raw(raw) {
    this.length = raw.readUInt16BE(2);
    //this.unknown1 = raw.readUInt32BE(4);
    this.did = raw.readUInt32BE(8);
    this.stamp = raw.readUInt32BE(12);
    this.md5 = raw.slice(16, 32);
    this.payload = raw.slice(32);
  }

  get raw() {
    let header = Buffer.alloc(32, 0);
    header.writeUInt16BE(0x2131, 0);
    header.writeUInt16BE(header.byteLength + this.payload.byteLength, 2);
    header.writeUInt32BE(this.did, 8);
    header.writeUInt32BE(this.stamp, 12);
    this.token.copy(header, 16);

    crypto.createHash('md5')
      .update(header).update(this.payload).digest()
      .copy(header, 16);

    return Buffer.concat([header, this.payload]);
  }
}

module.exports = Packet;
