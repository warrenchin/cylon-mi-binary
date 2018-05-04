/*jshint esversion: 6, -W116, -W035 */

const Cylon = require("cylon");
const debug = require('./debuggers');

module.exports = class extends Cylon.Driver {
  constructor(opts) {
    super(opts);

    opts = opts || {};
    this.did = opts.did;
    this.token = Buffer.from(opts.token, 'hex');

    // Include a list of commands that will be made available to external APIs.
    this.commands = {
      // This is how you register a command function for the API;
      // the command should be added to the prototype, see below.
      read: this.read
    };

    this.events = [
      'last_seen', // { old: new: datetime }
      'online' // { old: new: true/false}
    ];

    this.device = null;

    const _this = this;
    this.prop = new Proxy({}, {
      set(target, key, value) {
        if (target[key] !== value) {
          _this._emit(key, {old: target[key], new: value});
          target[key] = value;
        }

        return true;
      }
    });

    this.prop.online = false;
  }

  start(callback) {
    let waitTimer = setTimeout(() => {
      console.error('timeout waiting for', this.name);
      callback();
    }, 10 * 1000);

    try {
      this.device = this.connection.getDevice(this.did, this.token);
      this.device.name = this.name;

      this.device.on('ready', () => {
        console.log('%s sid: %s ready', this.name, this.did);
        this.device.cmd_info();
        clearTimeout(waitTimer);
        callback();
      });

      this.device.on("message", (msg) => {
        // if (msg.cmd === 'report') this._emit('report');

        if (!this.onmessage(msg)) {
          debug.rx("[ %s ] Unhandled: %o", this.name, msg);
        }
      });

      this.device.on('comm', () => this.updateOnlineStatus());

    } catch (e) {
      console.error('ERROR %s %s', this.name, e.toString());
    }
  }

  // noinspection JSUnusedGlobalSymbols
  halt(callback) {
    callback();
  }

  _emit(event, data) {
    if (event !== 'last_seen') debug.event('[ %s ] %s %o', this.name, event, data);
    this.emit(event, data);
  }

  updateOnlineStatus() {
    this.prop.online = true;
    this.prop.last_seen = Date.now();

    clearTimeout(this.timeoutHeartbeat);

    let timeoutMS = ((this.heartbeatIntervalS || 60) + 5) * 1000;
    this.timeoutHeartbeat = setTimeout(() => {
      this.prop.online = false;
    }, timeoutMS);
  }

  onmessage(msg) {
    return false;
  }
};

