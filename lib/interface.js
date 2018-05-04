/*jshint esversion: 6, -W116 */

const EventEmitter = require('events');
const dgram = require('dgram');
const crypto = require('crypto');

const Packet = require('./packet');
const debug = require('./debuggers');

const config = {
  multicastAddress: '255.255.255.255',
  multicastPort: 54321,
};

module.exports = class extends EventEmitter {
  constructor() {
    super();
    this.devices = {};
  }

  start() {
    this._createSocket();
    this._initServerSocket();
  }

  _createSocket() {
    this.serverSocket = dgram.createSocket({
      type: 'udp4',
      reuseAddr: true
    });
  }

  _initServerSocket() {
    let serverSocket = this.serverSocket;

    serverSocket.on('error', (err) => {
      console.error('ERROR msg: %s, stack: %s\n', err.message, err.stack);
    });

    serverSocket.on('listening', () => {
      this.serverSocket.setBroadcast(true);

      const address = this.serverSocket.address();
      console.log(`server listening on port ${address.port}.`);
      //this.serverSocket.addMembership(config.multicastAddress);
      this.emit('ready');
    });

    serverSocket.on('message', this._parseMessage.bind(this));

    serverSocket.bind();
  }

  _parseMessage(msg) {
    debug.raw('RX', msg);

    try {
      let packet = Packet.fromRaw(msg);
      let did = packet.did;

      if (!(did in this.devices)) {
        let token = (packet.length === 0x20) ? packet.md5 : null;
        this.devices[did] = new Device(this, did, token);
        debug.info('added device', did, 'token', token);
      }

      this.devices[did].emit('packet', packet);
    } catch (ex) {
      console.error(ex);
    }
  }

  getDevice(did, token) {
    if (!(did in this.devices)) {
      this.devices[did] = new Device(this, did);
      debug.info('added device from config', did);
    }

    if (!!token) {
      this.devices[did].token = token;
      debug.info('updated device token', token);
    }

    return this.devices[did];
  }

  hello() {
    let raw = Packet.hello();
    this.serverSocket.send(raw, 0, raw.length, config.multicastPort, config.multicastAddress);
    debug.raw('TX hello', raw);
  }

  send(packet) {
    let raw = packet.raw;
    this.serverSocket.send(raw, 0, raw.byteLength, config.multicastPort, config.multicastAddress);
    debug.raw('TX', raw, 'size', raw.byteLength);
  }
}

class Device extends EventEmitter {
  constructor(miioInterface, did, token) {
    super();
    this.miioInterface = miioInterface;
    this.did = did;
    this._token = null;
    this._tokenkey = null;
    this._iv = null;
    this._stamp = null;
    this._init = false;
    this._cmdId = 0;

    this.token = token;

    this.on('packet', (packet) => {
      this.stamp = packet.stamp;
      this.emit('comm');

      if (!this._init && !!this.token) {
        this._init = true;
        this.emit('ready');
      }

      packet.token = this.token;
      let payload = this.decrypt(packet.payload);

      if (!!payload) {
        let msg;

        try {
          msg = JSON.parse(payload); // msg is a Buffer
          //if (msg.hasOwnProperty('data')) msg.data = JSON.parse(msg.data);
        } catch (e) {
          console.error('Bad message: %s', payload.toString());
          return;
        }

        if (!!payload) {
          //debug.rx('[ %s ] %o', this.name, msg);
          this.emit('message', msg);
        }
      }

      // received {"result":{"life":274510,"cfg_time":0,"token":"ef5b011296d00b64c0bed64b99bcf1fd","mac":"28:6C:07:FA:35:4A","fw_ver":"1.4.1_154","hw_ver":"MW300","model":"lumi.gateway.v3","mcu_fw_ver":"0143","wifi_fw_ver":"SD878x-14.76.36.p84-702.1.0-WM","ap":{"rssi":-49,"ssid":"natali","bssid":"00:24:36:A9:5D:4B"},"netif":{"localIp":"192.168.1.50","mask":"255.255.255.0","gw":"192.168.1.1","gw_mac":"00:11:32:53:4D:3E"},"mmfree":168744,"ot":"ott","otu_stat":[45,103,24995,130,24560,23],"ott_stat":[2, 0, 163, 416]},"id":1}
      // received {"result":{"life":8117269,"cfg_time":0,"token":"8366edcf3f7f8c5d829d8cfac534be2b","mac":"F0:B4:29:AC:6F:F2","fw_ver":"1.2.4_17","hw_ver":"MW300","model":"chuangmi.plug.m1","wifi_fw_ver":"SD878x-14.76.36.p84-702.1.0-WM","ap":{"rssi":-50,"ssid":"natali","bssid":"00:24:36:A9:5D:4B"},"netif":{"localIp":"192.168.1.51","mask":"255.255.255.0","gw":"192.168.1.1"},"mmfree":27972,"ot":"ott","otu_stat":[319,315,1689,6,1669,491],"ott_stat":[31, 28, 650, 1214]},"id":1}
      // received {"result":{"life":2649747,"cfg_time":0,"token":"474675461936e0be7c06f10ddaafd1e9","mac":"64:09:80:29:CC:53","fw_ver":"1.2.4_7","hw_ver":"MC200","model":"chuangmi.plug.v1","wifi_fw_ver":"SD878x-14.76.36.p79-702.1.0-WM","ap":{"rssi":-83,"ssid":"natali","bssid":"00:24:36:A9:5D:4B"},"netif":{"localIp":"192.168.1.58","mask":"255.255.255.0","gw":"192.168.1.1"},"mmfree":24240,"ot":"ott","otu_stat":[467,407,170,0,168,499],"ott_stat":[40, 12, 422, 531]},"id":1}
      // received {"result":{"life":1801234,"token":"dfaaa6184766f4423af8c0c3b592950c","mac":"34:CE:00:C6:AA:BF","fw_ver":"1.2.8","hw_ver":"ESP8266","model":"yunmi.kettle.r1","mcu_fw_ver":"0017","wifi_fw_ver":"1.4.0(30e0bd0)","ap":{"rssi":-78,"ssid":"natali","bssid":"00:24:36:A9:5D:4B"},"netif":{"localIp":"192.168.1.61","mask":"255.255.255.0","gw":"192.168.1.1"},"mmfree":10432},"id":1}

    });

    // this.on('ready', () => {
    //     if (!!this.token) {
    //
    //     }
    // });
  }

  set token(t) {
    const empty = Buffer.alloc(16, 0);

    if (!!t && (t.compare(empty) !== 0)) {
      this._token = t;
      this._tokenkey = crypto.createHash('md5').update(t).digest();
      this._iv = crypto.createHash('md5').update(this._tokenkey).update(t).digest();
    }

    // else do not update, the token might have set from config
  }

  get token() {
    return this._token;
  }

  set stamp(s) {
    this._stamp = {stamp: s, ts: Date.now()};
  }

  get stamp() {
    let offset = Math.floor(Date.now() - this._stamp.ts) / 1000;
    return this._stamp.stamp + offset;
  }

  get cmdId() {
    return ++this._cmdId;
  }

  send(payload) {
    debug.tx('[ %s ] %o', this.name, payload);
    let packet = this._createPacket(payload);

    this.miioInterface.send(packet);
  }

  cmd_info() {
    this.send({
      id: this.cmdId,
      method: 'miIO.info',
      params: []
    });
  }

  _createPacket(payload) {
    let p = JSON.stringify(payload);
    return new Packet(this.did, this.token, this.stamp, this.encrypt(p));
  }

  encrypt(plaintext) {
    if (!!plaintext) {
      let cipher = crypto.createCipheriv('aes-128-cbc', this._tokenkey, this._iv);
      return Buffer.concat([cipher.update(plaintext), cipher.final()]);
    }

    return Buffer.alloc(0);
  }

  decrypt(ciphertext) {
    if (!!ciphertext && ciphertext.byteLength > 0) {
      let decipher = crypto.createDecipheriv('aes-128-cbc', this._tokenkey, this._iv);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    return null;
  }
};