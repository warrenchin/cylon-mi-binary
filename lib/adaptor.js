/*jshint esversion: 6, -W116, -W035, -W016 */

const Cylon = require('cylon');
const MiBinaryInterface = require('./interface');
const debug = require('./debuggers');

module.exports = class extends Cylon.Adaptor {
    constructor(opts) {
        super(opts);
        this.interface = new MiBinaryInterface();
    }

    connect(callback) {
        this.interface.on('ready', () => {
            debug.info('%s ready', this.name);

            let helloCount = 0;
            let helloTimer = () => {
                this.interface.hello();
                let interval = (helloCount++ < 3) ? 5 : 60;
                setTimeout(helloTimer, interval * 1000);
            };

            setImmediate(helloTimer);

            callback();
        });

        this.interface.on('message', msg => {
            this.emit("message", msg);
        });

        this.interface.start();
    }

    disconnect(callback) {
        callback();
    }

    getDevice(did, token = 0, name) {
        return this.interface.getDevice(did, token, name);
    }

    send(msg) {
        this.interface.send(msg);
    }
};

