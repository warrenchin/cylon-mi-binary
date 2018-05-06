/*jshint esversion: 6, -W116, -W035 */

const Driver = require('./driver');

module.exports = class extends Driver {
    constructor(opts) {
        super(opts);
        opts = opts || {};

        this.get_prop_params = opts.get_prop_params || ['tds'];

        Object.assign(this.commands, {});
    }
};

