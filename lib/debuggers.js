/*jshint esversion: 6 */

const debug = require('debug');

const info = debug('mi-binary:info');
const raw = debug('mi-binary:raw');
const rx = debug('mi-binary:rx');
const tx = debug('mi-binary:tx');
const event = debug('mi-binary:event');


module.exports = {
  info, raw, rx, tx, event
};