# cylon-mi-binary

Cylon.js (http://cylonjs.com) is a JavaScript framework for robotics, physical computing, and the Internet of Things (IoT).

This repository contains the Cylon adaptor for Xiaomi MiHome platform (https://www.mi.com/special/smart/), supports wifi based accessories.

The protocol is based on unofficial reverse engineering of Xiaomi Wifi based device communication, attributions to:
- https://github.com/OpenMiHome/mihome-binary-protocol
- https://github.com/aholstenson/miio
- https://github.com/rytilahti/python-miio

WIP, contributions are welcomed.

### Related Modules
Initially the plan is to have one module handling all mi-based device. However later I noticed the WiFi based devices using unofficial protocol are very different.

I decided to do it in separate modules:

adapter   | description                    | repo
----------|--------------------------------|-----------------------------------------------
mi-aqara  | Gateway & Zigbee based devices | https://github.com/warrenchin/cylon-mi-aqara
mi-binary | WiFi based devices             | https://github.com/warrenchin/cylon-mi-binary

## How to Install

```
npm install cylon cylon-mi-binary
```
## How to Use
### Sample

```javascript
const Cylon = require("cylon");

Cylon.robot({
    name: "caprica6",
    
    connections: {
        mi_binary: { adaptor: 'mi-binary' }
    },

    devices: {
        outlet_izlude: { driver: 'mi-binary.plug', did: 45317911, token: '8366edcf3f7f8c5d829d8cfac534ce2b', refresh: 60 },
        outlet_patio:  { driver: 'mi-binary.plug.withusb', did: 771296, token: '474675461936e0be7c06f10ddaafe1e9', refresh: 60 },
        powerstrip_study: { driver: 'mi-binary.powerstrip', did: 45540986, token: '6f2eb854fcc73bf79eccd48c3d4fb0e8', refresh: 60 },
        kettle_kitchen: { driver: 'mi-binary.kettle', did: 61862311, token: 'dfaaa6184766f4423af8c0c3b593950c', refresh: 60 }    
    },
    work: function(my) {
        // todo
    }
}).start();
```
### Events

```
'change' - triggered when prop value changed.

eg:
my.outlet_patio.on('change', (key, value, old) => {
    if (key === 'temperature') {
        console.log('plug's temperature changed from %s to %s', old, vaue);
    }
});

every((60).second, () => {
    console.log('power consumption %s W', my.powerstrip_study.prop.power_consume_rate);
});

Commons: 
online, last_seen

mi-binary.plug:
['power', 'temperature', 'wifi_led']

mi-binary.plug.withusb::
['power', 'usb_on', 'temperature', 'wifi_led']

mi-binary.powerstrip:
['power', 'temperature', 'wifi_led', 'power_price', 'current', 'power_consume_rate']

mi-binary.kettle:
['tds']

```

## commands
```
common:
    async get_info
    async get_prop(optional array)

mi-binary.plug:
    async set_power(state)
    async set_wifi_led(state)

mi-binary.plug.withusb::
    async set_power(state)
    async set_usb_power(state)
    async set_wifi_led(state)
    
mi-binary.powerstrip:
    async set_power(state)
    async set_wifi_led(state)
    
eg:
    console.log('powerstrip get_info:', await my.powerstrip_study.get_info());
    
    output:
    kettle get_info: { life: 8431386,
      cfg_time: 0,
      token: 'xxx',
      mac: 'F0:B4:29:AF:AA:6A',
      fw_ver: '1.2.4_50',
      hw_ver: 'MW300',
      model: 'zimi.powerstrip.v2',
      wifi_fw_ver: 'SD878x-14.76.36.p84-702.1.0-WM',
      ap: { rssi: -77, ssid: 'x', bssid: '00:24:37:A9:5D:4B' },
      netif: 
       { localIp: '192.168.1.57',
         mask: '255.255.255.0',
         gw: '192.168.1.1' },
      mmfree: 15040,
      ot: 'ott',
      otu_stat: [ 365, 312, 815, 0, 811, 320 ],
      ott_stat: [ 88, 30, 614, 1354 ] }
```
