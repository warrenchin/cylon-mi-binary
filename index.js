/*jshint esversion: 6 */

"use strict";

const Adaptor = require('./lib/adaptor');


const Drivers = {
    'mi-binary.plug': require('./lib/plug'),
    'mi-binary.plug.withusb': require('./lib/plug_with_usb'),
    'mi-binary.powerstrip': require('./lib/powerstrip'),
    'mi-binary.kettle': require('./lib/kettle')
};

module.exports = {
    adaptors: ["mi-binary"],
    drivers: Object.keys(Drivers),

    // Modules intended to be used with yours, e.g. ["cylon-gpio"]
    dependencies: [],

    adaptor: function (opts) {
        return new Adaptor(opts);
    },

    driver: function (opts) {
        opts = opts || {};

        if (Drivers[opts.driver]) {
            return new Drivers[opts.driver](opts);
        }

        return null;
    }
};
