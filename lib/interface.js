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
            if (packet.did in this.devices) this.devices[did].emit('packet', packet);
        } catch (ex) {
            console.error(ex);
        }
    }

    getDevice(did, token, name) {
        if (!(did in this.devices)) {
            this.devices[did] = new Device(this, did, null, name);
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
};

class Device extends EventEmitter {
    constructor(binaryInterface, did, token, name) {
        super();
        this._interface = binaryInterface;
        this._did = did;
        this._token = null;
        this._tokenkey = null;
        this._iv = null;
        this._stamp = null;
        this._init = false;
        this.name = name;
        this.debug = require('debug')(this.name + ':comm');
        this._commandProxy = new CommandProxy(this, this.debug);

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
                    if ('id' in msg) this.emit('message', msg);
                    else this.debug('Unexpected %o', this.name, msg);
                }
            }
        });
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

    _createPacket(payload) {
        let p = (typeof payload === 'string')? payload : JSON.stringify(payload);
        return new Packet(this._did, this.token, this.stamp, this.encrypt(p));
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

    command(msg, timeoutS) {
        return this._commandProxy.command(msg, timeoutS);
    }
}

class CommandProxy {
    constructor(source, debug) {
        this.source = source;
        this._id = 0;
        this._registry = new Map();
        this.debug = debug;

        source.on('message', (msg) => {
            let callback = this._registry[msg.id];
            if (!!callback) {
                callback(msg);
                this._registry.delete(msg.id);
            }
        });
    }

    command(msg, timeoutS) {
        return new Promise((resolve, reject) => {
            if (this._id >= 9999) this._id = 0;
            msg.id = ++this._id;

            timeoutS = timeoutS || 5; // default to 5s timeout
            let timeout = setTimeout(() => {
                reject({ error: 'timeout', device: this.source.name, command: msg});
                this._registry.delete(msg.id);
            }, timeoutS * 1000);

            this._registry[msg.id] = (reply) => {
                this.debug('RX %o', reply);
                clearTimeout(timeout);
                resolve(reply);
            };

            this._send(msg);
        });
    }

    _send(payload) {
        this.debug('TX %o', payload);
        let packet = this.source._createPacket(payload);
        this.source._interface.send(packet);
    }
}