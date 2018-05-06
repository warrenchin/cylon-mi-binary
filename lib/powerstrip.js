/*jshint esversion: 6, -W116, -W035 */

const Driver = require('./driver');

module.exports = class extends Driver {
    constructor(opts) {
        super(opts);
        opts = opts || {};

        // mode: 'green', 'normal'?
        // V1: 'power','temperature', 'current', 'mode', 'power_consume_rate', 'voltage', 'power_factor', 'elec_leakage'
        this.get_prop_params = opts.get_prop_params || ['power', 'temperature', 'wifi_led', 'power_price', 'current', 'power_consume_rate'];

        Object.assign(this.commands, {
            set_power: this.set_power,
            set_wifi_led: this.set_wifi_led
        });
    }

    async set_power(state) { // jshint ignore:line
        return this.set_state('set_power', Driver.onoff_state(state));
    }

    async set_wifi_led(state) { // jshint ignore:line
        return this.set_state('set_wifi_led', Driver.onoff_state(state));
    }
};

