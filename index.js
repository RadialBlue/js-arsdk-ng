/*
 * Copyright 2017-2019 Tom Swindell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 */
const { ARSDK } = require('./src/')
const mdns = require('mdns-js')

/*
 * @public
 * @class
 */
function ARSDKConnectionManager () {
  /**
   * @public
   * @method ARSDKConnectionManager#connect
   * 
   * @param {string} host
   * @param {Object} [opts]
   */
  const connect = async (host, opts) => {
    return ARSDK.connect(host)
      .then(async arsdk => {
        console.info('Application connected to:', host)

        arsdk.on('property:changed', (fId, mId, value) => {
          console.info(fId, mId, '=', value)
        })

        console.info('Attempting to initialize SkyController...')
        const hasController = await arsdk.hasFeature(ARSDK.FEATURE_SKYCTRL)
        if (hasController) {
          console.info("SkyController Details:")
          const skyctrl = arsdk.GetInterface(ARSDK.FEATURE_SKYCTRL)
          const manager = arsdk.GetInterface(ARSDK.FEATURE_DRONE_MANAGER)
    
          await skyctrl.Settings.AllSettings()
    
          const version = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_PRODUCT_VERSION)
          const battery = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY)
          const battery_state = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY_STATE)
    
          if (version) {
            console.info(`  Software: ${version.software}`)
            console.info(`  Hardware: ${version.hardware}`)
            console.info(`   Battery: ${battery.percent}% - ${battery_state.state}`)
            console.info()
          }
    
          const connection_state = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_CONNECTION_STATE)
          console.info(connection_state)
          console.info()
    
          const known = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_KNOWN_DRONES)
          Object.keys(known).forEach(serial => {
            const item = known[serial]
            console.info(`${serial} ${item.name} - ${ARSDK.PRODUCT_NAMES[item.model]} (${item.security})`)
          })
          console.info()
    
          /*
          await manager.discover()
            .then(result => console.info(result))
            .catch(error => console.error('E', error))

          */
    
          await manager.forget('PI040384AD62783')
            .then(result => console.info(result))
            .catch(error => console.error('E', error))
    
          return arsdk
        } else {
          console.info('No sky controller detected')
        }
      })
  }

  this.connect = connect
}

/**
 * @public
 * @class
 * 
 * @param {ARSDKConnectionManager} __connections 
 */
function ARSDKDiscoveryManager (__connections) {
  let __browser
  let __discovery_timeout

  const __discovered = {}

  /**
   * @private
   * @method ARSDKDiscoveryManager#startup
   */
  const discover = () => {
    if (__browser) __browser.stop()

    __browser = mdns.createBrowser()

    __browser.on('ready', () => {
      __browser.discover()
      __discovery_timeout = setTimeout(discover, 5000)
    })

    __browser.on('update', async ({ addresses, type }) => {
      type = type[0]
      if (!type.name.startsWith('arsdk')) return

      const model = Number('0x' + type.name.split('-')[1])
      const host = addresses[0] + ':44444'
  
      if (host in __discovered) return

      console.info('Discovered ARSDK device:', host, `(${ARSDK.PRODUCT_NAMES[model]})`)
      const connection = await __connections.connect(host)

      connection.on('close', () => {
        console.info('Removing discovery:', host)
        delete __discovered[host]
      })

      __discovered[host] = connection
    })
  }

  /**
   * @public
   * @method ARSDKDiscoveryManager#startup
   */
  const startup = () => {
    discover()
  }

  /**
   * @public
   * @method ARSDKDiscoveryManager#shutdown
   */
  const shutdown = () => {
    clearTimeout(__discovery_timeout)
    __discovery_timeout = null

    __browser.stop()
    __browser = null
  }

  this.startup = startup
  this.shutdown = shutdown
}

// ============================================================================
const manager = new ARSDKConnectionManager()
const discovery = new ARSDKDiscoveryManager(manager)
discovery.startup()

/*
const onDisconnect = () => {
  console.info('DISCONNECTED')
}

const onPropertyChanged = (feature, property, value) => {
  console.info(feature, property, value)
}

const browser = mdns.createBrowser()
browser.on('ready', () => browser.discover())
browser.on('update', ({ addresses, type }) => {
  type = type[0]
  if (type.name.startsWith('arsdk')) {
    const model = Number('0x' + type.name.split('-')[1])
    const host = addresses[0] + ':44444'

    console.info('Found ARSDK device:', host, `(${ARSDK.PRODUCT_NAMES[model]})`)

    ARSDK.connect(host)
      .then(async arsdk => {
        console.info('Application connected to:', host)

        arsdk.on('disconnect', onDisconnect)
        arsdk.on('property:changed', onPropertyChanged)

        console.info('Attempting to initialize SkyController...')
        const hasController = await arsdk.hasFeature(ARSDK.FEATURE_SKYCTRL)
        if (hasController) {
          console.info("SkyController Details:")
          const skyctrl = arsdk.GetInterface(ARSDK.FEATURE_SKYCTRL)
          const manager = arsdk.GetInterface(ARSDK.FEATURE_DRONE_MANAGER)
    
          await skyctrl.Settings.AllSettings()
    
          const version = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_PRODUCT_VERSION)
          const battery = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY)
          const battery_state = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY_STATE)
    
          if (version) {
            console.info(`  Software: ${version.software}`)
            console.info(`  Hardware: ${version.hardware}`)
            console.info(`   Battery: ${battery.percent}% - ${battery_state.state}`)
            console.info()
          }
    
          const connection_state = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_CONNECTION_STATE)
          console.info(connection_state)
          console.info()
    
          const known = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_KNOWN_DRONES)
          Object.keys(known).forEach(serial => {
            const item = known[serial]
            console.info(`${serial} ${item.name} - ${ARSDK.PRODUCT_NAMES[item.model]} (${item.security})`)
          })
          console.info()
    
          /*
          await manager.discover()
            .then(result => console.info(result))
            .catch(error => console.error('E', error))
    
          await manager.forget('PI040384AD62783')
            .then(result => console.info(result))
            .catch(error => console.error('E', error))
    
        } else {
          console.info('No sky controller detected')
        }    
      })
      .catch(error => console.error(error))
  }
})
*/

/*
ARSDK.connect('192.168.53.1:44444')
  .then(async arsdk => {
    console.info('Application connected...')

    arsdk.on('disconnect', onDisconnect)
    arsdk.on('property:changed', onPropertyChanged)

    let deviceName
    let deviceType

    let isConnected = false

    console.info('Attempting to detect ARDrone3 device...')
    const hasDrone = await arsdk.hasFeature(ARSDK.FEATURE_ARDRONE3)  
    if (hasDrone) {
      console.info("Detected ARDrone3 device.")
      const ardrone3 = arsdk.GetInterface(ARSDK.FEATURE_ARDRONE3)
      await ardrone3.SetVideoStabilizationMode("roll")
        .then(result => console.log(result))

      isConnected = true
    } else {
      console.info('No drone detected.')
    }
  
    console.info('Attempting to detect SkyController...')
    const hasController = await arsdk.hasFeature(ARSDK.FEATURE_SKYCTRL)
    if (hasController) {
      console.info("Detected SkyController:")
      const skyctrl = arsdk.GetInterface(ARSDK.FEATURE_SKYCTRL)
      const manager = arsdk.GetInterface(ARSDK.FEATURE_DRONE_MANAGER)

      await skyctrl.Settings.AllSettings()

      const version = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_PRODUCT_VERSION)
      const battery = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY)
      const battery_state = arsdk.GetBuffer(ARSDK.BUFFER_SKYCTRL_BATTERY_STATE)

      if (version) {
        console.info(`  Software: ${version.software}`)
        console.info(`  Hardware: ${version.hardware}`)
        console.info(`   Battery: ${battery.percent}% - ${battery_state.state}`)
        console.info()
      }

      const connection_state = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_CONNECTION_STATE)
      console.info(connection_state)
      console.info()

      const known = arsdk.GetBuffer(ARSDK.BUFFER_DRONE_MANAGER_KNOWN_DRONES)
      Object.keys(known).forEach(serial => {
        const item = known[serial]
        console.info(`${serial} ${item.name} - ${ARSDK.PRODUCT_NAMES[item.model]} (${item.security})`)
      })
      console.info()

      await manager.discover()
        .then(result => console.info(result))
        .catch(error => console.error('E', error))

      await manager.forget('PI040384AD62783')
        .then(result => console.info(result))
        .catch(error => console.error('E', error))

    } else {
      console.info('No sky controller detected')
    }

    try {
      arsdk.disconnect()
    } catch(e) {
      console.error(e)
    }
  })
  .catch((error) => {
    console.error(error)
  })
*/