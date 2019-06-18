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

/**
 * @public
 * @class
 * 
 * @params {Connection} connection
 */
function DroneManager (__connection) {
  const send = (command, params) =>
      __connection.sendCommand('drone_manager.commands.' + command, params)

  /**
   * @public
   * @method DroneManager#discover
   */
  this.discover = () => send('discover_drones')

  /**
   * @public
   * @method DroneManager#discover
   * 
   * @params {String} serial
   * @params {String} key
   */
  this.connect = (serial, key) => send('connect', { serial, key })

  /**
   * @public
   * @method DroneManager#discover
   * 
   * @params {String} serial
   */
  this.forget = (serial) => send('forget', { serial, timeout: 2000 })
}

DroneManager.isPresent = (connection) => {
  return new Promise(resolve => {
    connection.sendCommand('drone_manager.commands.discover_drones')
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

module.exports = DroneManager