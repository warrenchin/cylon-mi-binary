# cylon-mi-binary

Cylon.js (http://cylonjs.com) is a JavaScript framework for robotics, physical computing, and the Internet of Things (IoT).

This repository contains the Cylon adaptor for Xiaomi MiHome platform (https://www.mi.com/special/smart/), supports wifi based accessories.

The protocol is based on unofficial reverse engineering of Xiaomi Wifi based device communication, attributions to:
- https://github.com/OpenMiHome/mihome-binary-protocol
- https://github.com/aholstenson/miio

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
// todo
## Sample

```javascript
const Cylon = require("cylon");

Cylon.robot({
  name: "caprica6",

  connections: {
    aqara: { adaptor: 'mi-binary' }
  },

  devices: {
    // todo
  },

  work: function(my) {
    // todo
  }
}).start();
```
## Events

```
commons
'last_seen', // { old: new: datetime}
'online' // { old: new: true/false}

// todo
```

## commands
```
// todo
```
