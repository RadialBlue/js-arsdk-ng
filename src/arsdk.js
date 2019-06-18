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
const os = require('os')
const axios = require('axios')
const EventEmitter = require('events')

const { UDPAcceptor } = require('./net/udp.js')
const { TCPConnector } = require('./net/tcp.js')

const { DiscoveryFactory } = require('./discovery.js')

const { MAVClient } = require('./mav.js')
const { RTPClient } = require('./rtp.js')

const CONSTANTS = {
  // SOURCE:
  //   https://github.com/Parrot-Developers/libARDiscovery/blob/master/Sources/ARDISCOVERY_Discovery.c

  PRODUCT_NAMES: {
    0x0900: "Rolling Spider",
    0x0907: "Airborne Night",
    0x0909: "Airborne Cargo",
    0x090a: "Hydrofoil",
    0x090b: "Mambo",
    0x0910: "Swing",

    0x0901: "Bebop Drone",
    0x0902: "Jumping Sumo",
    0x0903: "SkyController",
    0x0905: "Jumping Night",
    0x0906: "Jumping Race",
    0x090c: "Bebop 2",
    0x090d: "Power Up",
    0x090e: "Disco",
    0x0913: "SkyController",
    0x0916: "Bluegrass",

    0x090f: "SkyController 2",
    0x0915: "SkyController 2P",
  },

  // Bluetooth devices
  PRODUCT_MINIDRONE: 0x0900,
  PRODUCT_MINIDRONE_EVO_LIGHT: 0x0907,
  PRODUCT_MINIDRONE_EVO_BRICK: 0x0909,
  PRODUCT_MINIDRONE_EVO_HYDROFOIL: 0x090a,
  PRODUCT_MINIDRONE_DELOS3: 0x090b,
  PRODUCT_MINIDRONE_WINGX: 0x0910,

  // Networked devices
  PRODUCT_ARDRONE: 0x0901,
  PRODUCT_JS: 0x0902,
  PRODUCT_SKYCONTROLLER: 0x0903,
  PRODUCT_JS_EVO_LIGHT: 0x0905,
  PRODUCT_JS_EVO_RACE: 0x0906,
  PRODUCT_BEBOP_2: 0x090c,
  PRODUCT_POWER_UP: 0x090d,
  PRODUCT_EVINRUDE: 0x090e,
  PRODUCT_SKYCONTROLLER_NG: 0x0913,
  PRODUCT_CHIMERA: 0x0916,

  // USB devices ?
  PRODUCT_SKYCONTROLLER_2: 0x090f,
  PRODUCT_SKYCONTROLLER_2P: 0x0915,

  FEATURE_ARDRONE3: 'ardrone3',
  FEATURE_COMMON: 'common',
  FEATURE_SKYCTRL: 'skyctrl',
  FEATURE_DRONE_MANAGER: 'drone_manager',
  FEATURE_MAPPER: 'mapper',
  FEATURE_RC: 'rc',

  // XXX - Implement test that does a AllStates request and makes sure these keys
  // are present and match.
  BUFFER_COMMON_PRODUCT_NAME: 'common.SettingsState.ProductName',
  BUFFER_COMMON_PRODUCT_SERIAL_HIGH: 'common.SettingsState.ProductSerialHigh',
  BUFFER_COMMON_PRODUCT_SERIAL_LOW: 'common.SettingsState.ProductSerialLow',
  BUFFER_COMMON_PRODUCT_VERSION: 'common.SettingsState.ProductVersion',
  BUFFER_COMMON_AUTO_COUNTRY: 'common.SettingsState.AutoCountry',
  BUFFER_COMMON_COUNTRY: 'common.SettingsState.Country',
  BUFFER_COMMON_BOARD_ID: 'common.SettingsState.BoardId',
  BUFFER_COMMON_BATTERY: 'common.CommonState.BatteryState',
  BUFFER_COMMON_CURRENT_DATE: 'common.CommonState.CurrentDate',
  BUFFER_COMMON_CURRENT_TIME: 'common.CommonState.CurrentTime',
  BUFFER_COMMON_WIFI_SIGNAL: 'common.CommonState.WifiSignal',
  BUFFER_COMMON_SENSORS: 'common.CommonState.SensorsStatesList',
  BUFFER_COMMON_MAVLINK_STATE: 'common.MavlinkState.MavlinkFilePlayingState',

  BUFFER_ARDRONE3_AIR_SPEED: '',
  BUFFER_ARDRONE3_ALTITUDE: '',
  BUFFER_ARDRONE3_ATTITUDE: '',
  BUFFER_ARDRONE3_LATITUDE: '',
  BUFFER_ARDRONE3_SPEED: '',

  BUFFER_ARDRONE3_CPUID: 'ardrone3.SettingsState.CPUID',
  BUFFER_ARDRONE3_GPS_VERSION: 'ardrone3.SettingsState.ProductGPSVersionChanged',
  BUFFER_ARDRONE3_CIRCLING_DIRECTION: '',
  BUFFER_ARDRONE3_CIRCLING_ALTITUDE: '',
  BUFFER_ARDRONE3_MAX_ALTITUDE: '',
  BUFFER_ARDRONE3_MIN_ALTITUDE: '',
  BUFFER_ARDRONE3_MAX_DISTANCE: '',
  BUFFER_ARDRONE3_NO_FLY_OVER_MAX_DISTANCE: '',
  BUFFER_ARDRONE3_PITCH_MODE: '',
  BUFFER_ARDRONE3_OUTDOOR_MODE: '',
  BUFFER_ARDRONE3_CAMERA_ORIENTATION: '',
  BUFFER_ARDRONE3_WIFI_SELECTION: '',
  BUFFER_ARDRONE3_PICTURE_FORMAT: '',
  BUFFER_ARDRONE3_WHITE_BALANCE: '',
  BUFFER_ARDRONE3_EXPOSURE: '',
  BUFFER_ARDRONE3_SATURATION: '',
  BUFFER_ARDRONE3_TIMELAPSE: '',
  BUFFER_ARDRONE3_AUTO_RECORD: '',
  BUFFER_ARDRONE3_STABILIZATION_MODE: '',
  BUFFER_ARDRONE3_RECORDING_MODE: '',
  BUFFER_ARDRONE3_FRAMERATE: '',
  BUFFER_ARDRONE3_RESOLUTION: '',
  BUFFER_ARDRONE3_RETURN_HOME_DELAY: '',
  BUFFER_ARDRONE3_HOME_TYPE: '',


  BUFFER_SKYCTRL_PRODUCT_VERSION: 'skyctrl.SettingsState.ProductVersion',
  BUFFER_SKYCTRL_PRODUCT_SERIAL: 'skyctrl.SettingsState.ProductSerial',
  BUFFER_SKYCTRL_BATTERY: 'skyctrl.SkyControllerState.Battery',
  BUFFER_SKYCTRL_BATTERY_STATE: 'skyctrl.SkyControllerState.BatteryState',
  BUFFER_SKYCTRL_MAGNETO_CALIBRATION_STATE: 'skyctrl.CalibrationState.MagnetoCalibrationState',
  BUFFER_SKYCTRL_MAGNETO_CALIBRATION_UPDATE_STATE: 'skyctrl.CalibrationState.MagnetoCalibrationUpdatesState',

  BUFFER_DRONE_MANAGER_CONNECTION_STATE: 'drone_manager.connection_state',
  BUFFER_DRONE_MANAGER_DISCOVERED_DRONES: 'drone_manager.drone_list_item',
  BUFFER_DRONE_MANAGER_KNOWN_DRONES: 'drone_manager.known_drone_item',
}

/**
 * @public
 * @class
 * 
 * @param {Object} [opts]
 * @param {String} [opts.address="192.168.53.1"]
 * @param {uint16} [opts.port=44444]
 * @param {string} [opts.controller_type="js-arsdk"]
 * @param {string} [opts.controller_name=$HOSTNAME]
 * @param {Logger} [opts.logger=console]
 */
function ARSDKClient (__opts) {
  __opts = Object.assign({
    address: '192.168.53.1',
    port: 44444,
  }, __opts || {})

  EventEmitter.call(this)

  const __self = this
  const __log = __opts.logger || console

  const host = `${__opts.address}:${__opts.port}`

  let __ctrl
  let __rtsp
  let __rtcp

  /**
   * Connect to networked drone or controller device.
   * @public
   * @method ARSDKClient#connect
   * 
   * @returns {ARSDKClient} self
   */
  const connect = async () => {
    // Initialize Controller and RTP streaming UDP connections.
    if (process.env.ARSDK_NET_DEBUG >= 1) {
      __log.info('ARSDKClient#connect() - Instantiating control and video stream service handlers.')
    }
    __ctrl = await (new UDPAcceptor({logger: __log}))
        .create(connection => new MAVClient(connection))

    __rtsp = await (new UDPAcceptor({logger: __log}))
        .create(connection => new RTPClient(connection))

    __rtcp = await (new UDPAcceptor({logger: __log}))
        .create(connection => new RTPClient(connection))

    // Assemble discovery info handshake parameters.
    const params = {
      controller_type: __opts.controller_type || 'js-arsdk',
      controller_name: __opts.controller_name || os.hostname(),
      d2c_port: __ctrl.port,
      arstream2_client_stream_port: __rtsp.port,
      arstream2_client_control_port: __rtcp.port,
    }

    // Connect to remote device discovery TCP port.
    if (process.env.ARSDK_NET_DEBUG >= 1) {
      __log.info('ARSDKClient#connect() - Attempting to connect to discovery service.')
    }
    const connector = new TCPConnector()
    return await connector.connect(__opts.address, __opts.port, DiscoveryFactory(params, { logger: __log }))
      .then(async params => {
        // Initialize service handlers
        await __ctrl.init(__opts.address, params.c2d_port)
        await __rtsp.init(params)
        await __rtcp.init(params)

        // Triggers RTP streaming, should use API.
        //axios.get('http://192.168.53.1:7711/video')

        // Listen to special service handler events.
        __ctrl.on('error', disconnect)
        __ctrl.on('close', () => __self.emit('close'))

        __ctrl.on('message:event', mesg => __self.emit('message:event', mesg))
        __ctrl.on('message:command', mesg => __self.emit('message:command', mesg))
        __ctrl.on('property:changed', (fId, prop, value) => __self.emit('property:changed', fId, prop, value))

        // Passthrough control interface.
        __self.sendFrame = __ctrl.sendFrame.bind(__ctrl)
        __self.sendMessage = __ctrl.sendMessage.bind(__ctrl)
        __self.sendCommand = __ctrl.sendCommand.bind(__ctrl)

        __self.hasFeature = __ctrl.hasFeature.bind(__ctrl)
        __self.GetInterface = __ctrl.GetInterface.bind(__ctrl)
        __self.GetBuffer = __ctrl.GetBuffer.bind(__ctrl)

        return Promise.resolve(__self)
      })
      .catch(error => {
        __log.error('Failed to connect:', error)
        disconnect()

        return Promise.reject(error)
      })
  }

  /**
   * Disconnect from networked drone or controller device.
   * @public
   * @method ARSDKClient#disconnect
   */
  const disconnect = async () => {
    if (process.env.ARSDK_NET_DEBUG >= 1) {
      __log.info('ARSDKClient#disconnect() - Shutting down.')
    }

    __ctrl.shutdown()
    __rtsp.shutdown()
    __rtcp.shutdown()
  }

  this.connect = connect
  this.disconnect = disconnect
}
ARSDKClient.prototype = Object.create(EventEmitter.prototype)

/**
 * @public
 * @function
 * 
 * @param {String} host 
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 */
const connect = (host, opts) => {
  const [ address, port ] = host.split(':')

  const client = new ARSDKClient(Object.assign({
    address, port,
  }, opts || {}))

  return client.connect()
}

module.exports = Object.assign(CONSTANTS, { connect })
