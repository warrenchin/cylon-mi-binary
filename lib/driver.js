/*jshint esversion: 6, -W116, -W035 */

const Cylon = require("cylon");

module.exports = class extends Cylon.Driver {
    constructor(opts) {
        super(opts);

        opts = opts || {};
        this.did = opts.did;
        this.token = Buffer.from(opts.token, 'hex');
        this.get_prop_refreshS = opts.refresh || 60; // default auto refresh 60s, 0 to disable

        // Include a list of commands that will be made available to external APIs.
        this.commands = {
            get_info: this.get_info,
            get_prop: this.get_prop
        };

        this.events = [
            'change' // { key: value: old: }
        ];

        this.device = this.connection.getDevice(this.did, this.token, this.name);
        this.debugevent = require('debug')(this.name + ':event');

        const _this = this;
        this.prop = new Proxy({
            online: false
        }, {
            set(target, key, value) {
                if (target[key] !== value) {
                    _this._emit('change', {'key': key, 'value': value, 'old': target[key]});
                    target[key] = value;
                }

                return true;
            }
        });
    }

    start(callback) {
        let waitTimer = setTimeout(() => {
            console.error('timeout waiting for', this.name);
            callback();
        }, 10 * 1000);

        try {
            this.device.on('ready', () => {
                console.log('%s sid: %s ready', this.name, this.did);
                this.get_info();

                clearTimeout(waitTimer);
                callback();

                this.get_prop();
            });

            this.device.on('comm', () => this.updateOnlineStatus());

        } catch (e) {
            console.error('ERROR %s %s', this.name, e.toString());
        }
    }

    // noinspection JSUnusedGlobalSymbols, JSMethodCanBeStatic
    halt(callback) {
        callback();
    }

    _emit(event, payload) {
        if (payload.key !== 'last_seen') this.debugevent('%o, %o', event, payload);
        this.emit(event, payload);
    }

    updateOnlineStatus() {
        this.prop.online = true;
        this.prop.last_seen = Date.now();

        clearTimeout(this.timeoutHeartbeat);

        let timeoutMS = ((this.heartbeatIntervalS || 120) + 10) * 1000;
        this.timeoutHeartbeat = setTimeout(() => {
            this.prop.online = false;
        }, timeoutMS);
    }

    startAutoRefresh() {
        if (this.get_prop_refreshS === 0) return;

        if (!!this.get_prop_refresh_timer) clearInterval(this.get_prop_refresh_timer);
        this.get_prop_refresh_timer = setInterval(this.get_prop.bind(this), this.get_prop_refreshS * 1000);
    }

    async get_info() { // jshint ignore:line
        try {
            let reply = await this.device.command({ // jshint ignore:line
                method: 'miIO.info',
                params: []
            }, 5);

            Object.assign(this.prop, reply.result);
            return reply.result;

        } catch (e) {
            console.error('%o', e);
        }
    }

    async get_prop(prop) { // jshint ignore:line
        prop = prop || this.get_prop_params;

        if (!Array.isArray(prop)) {
            console.error({error: 'array expected', device: this.name, 'prop': prop});
            return null;
        }

        try {
            let reply = await this.device.command({ // jshint ignore:line
                method: 'get_prop',
                params: prop
            }, 5);

            this.startAutoRefresh();

            let ret = {};
            for (let i = 0; i < prop.length; i++) {
                ret[prop[i]] = reply.result[i];
            }

            Object.assign(this.prop, ret);
            return ret;

        } catch (e) {
            console.error('%o', e);
        }
    }

    static onoff_state(state) { return state? 'on' : 'off'; }

    async set_state(method, state = null) { // jshint ignore:line
        let p = (!!state)? [ state ] : [];

        try {
            let reply = await this.device.command({ // jshint ignore:line
                'method': method, 'params': p
            }, 5);

            await this.get_prop(); // jshint ignore:line
            if (Array.isArray(reply.result)) return reply.result[0] === 'ok';
            else return reply.result === 0;

        } catch(e) {
            console.error(e);
        }
    }
};

