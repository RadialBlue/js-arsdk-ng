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
const CommandSet = require('./commands.js')

const {
  Protocol,
  Messaging,
  Watchdog,
  Features,
} = require('./mixins/')

const EventEmitter = require('events')

/**
 * Implements a ServiceHandler which manages connections to remote ARSDK devices.
 * @public
 * @class
 * 
 * @param {Connection} connection
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 */
function MAVClient (__connection, __opts) {
  __opts = Object.assign({
    logger: console
  }, __opts || {})

  EventEmitter.call(this)

  const __self = this

  let __address
  let __port

  /**
   * Initializes ARSDK API interface components on supplied connection.
   * Links control port to supplied remote device address and port.
   * 
   * @public
   * @method MAVClient#init
   * 
   * @param {String} address 
   * @param {uint16} port 
   */
  const init = async (address, port) => {
    __address = address
    __port = port

    // Create ARSDK message dictionary.
    const messages = new CommandSet()
    await messages.import(
      'common',
      'ardrone3',
      'skyctrl',
      'drone_manager',
      'mapper',
      'rc'
    )

    // Add communication watchdog
    Watchdog.call(__connection, { timeout: 5000 })

    // Add ARSDK protocol frame handling.
    Protocol.call(__connection, address, port)

    // Add ARSDK messages and message transaction handling
    Messaging.call(__connection, messages)

    // Add ARSDK feature management API
    Features.call(__connection)

    __connection.on('message:event', mesg => __self.emit('message:event', mesg))
    __connection.on('message:command', mesg => __self.emit('message:command', mesg))
    __connection.on('property:changed', (fId, mId, v) => __self.emit('property:changed', fId, mId, v))

    __self.sendFrame   = __connection.sendFrame.bind(__connection)
    __self.sendMessage = __connection.sendMessage.bind(__connection)
    __self.sendCommand = __connection.sendCommand.bind(__connection)

    __self.hasFeature = __connection.hasFeature
    __self.GetInterface = __connection.GetInterface
    __self.GetBuffer = __connection.GetBuffer
  }

  /**
   * Disassociates and closes underlying control connection with remote device.
   * 
   * @public
   * @method MAVClient#shutdown
   */
  const shutdown = async () => {
    try {
      __connection.close()
    } catch (error) {
      // Ignore
    }
  }

  /**
   * The port number for the local controller port for incoming "D2C" traffic.
   * @public
   * @member MAVClient#port
   */
  this.port = __connection.address().port

  this.init = init
  this.shutdown = shutdown

  __connection.on('close', () => __self.emit('close'))
  __connection.on('error', (error) => __self.emit('error', error))
}
MAVClient.prototype = Object.create(EventEmitter.prototype)

module.exports = { MAVClient }