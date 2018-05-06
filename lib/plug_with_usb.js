/*jshint esversion: 6, -W116, -W035 */

const Driver = require('./driver');

module.exports = class extends Driver {
    constructor(opts) {
        super(opts);
        opts = opts || {};

        this.get_prop_params = opts.get_prop_params || ['power', 'usb_on', 'temperature', 'wifi_led'];

        Object.assign(this.commands, {
            set_power: this.set_power,
            set_usb_power: this.set_usb_power,
            set_wifi_led: this.set_wifi_led
        });
    }

    async set_power(state) { // jshint ignore:line
        return this.set_state('set_power', Driver.onoff_state(state));
    }

    async set_usb_power(state) { // jshint ignore:line
        if (state) return this.set_state('set_usb_on');
        else return this.set_state('set_usb_off');
    }

    async set_wifi_led(state) { // jshint ignore:line
        return this.set_state('set_wifi_led', Driver.onoff_state(state));
    }
};

