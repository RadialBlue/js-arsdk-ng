## Introduction

Pure JavaScript Node.js implementation of the ARSDK, for communicating with Parrot drones like the Parrot Bebop and Disco aircraft.

## Getting Started

Follow these instructions to start developing with Parrot based drones using Node.js in JavaScript!

#### 1. Installation

Create a Node.js project and then install the js-arsdk library.

```bash
npm install --save @radial.blue/js-arsdk
```

#### 2. Start Coding

Once you have your Node.js project setup, to create a device manager and connect to a device.

```javascript
const { ARSDK } = require('./src/')

ARSDK.connect('192.168.53.1:44444')
  .then(async arsdk => {
    console.info('Application connected...')

    const hasController = await arsdk.hasFeature(ARSDK.FEATURE_SKYCTRL)
    if (hasController) {
      console.info("Detected SkyController:")
      const skyctrl = arsdk.GetInterface(ARSDK.FEATURE_SKYCTRL)
      await skyctrl.Common.AllStates()

      const version = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_PRODUCT_VERSION)
      const battery = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY)
      const battery_state = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY_STATE)

      if (version) {
        console.info(`  Software: ${version.software}`)
        console.info(`  Hardware: ${version.hardware}`)
        console.info(`   Battery: ${battery.percent}% - ${battery_state.state}`)
        console.info()
      }

      await skyctrl.Settings.AllSettings()
    } else {
      // If no controller was detected, then presume directly connected to drone.
      isConnected = true
    }

    arsdk.disconnect()
  })
  .catch((error) => {
    console.error(error)
  })
```

## Reference API Documentation

The API Reference documenation can be found [HERE](https://radialblue.github.io/js-arsdk/api/)

## More Examples

```javascript
throw 'NOT_IMPLEMENTED_YET'
```

## Support

If you'd like to support the development of this project, I accept
crypto :)

```json
{
  "BTC": null,
  "ETH": "0xef3b6dc2211a8E1626014bF230c4a794B18DDdD5",
  "LTC": null
}
```

## Authors

* [**Tom Swindell**](https://github.com/tswindell) - *Creator*