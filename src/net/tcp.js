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
const net = require('net')

/**
 * Handles the creation of an IPv4 TCP connection to a remote service.
 * @public
 * @class
 * 
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 */
function TCPConnector (__opts) {
  __opts = Object.assign({
    logger: console,
  }, __opts || {})

  const __log = __opts.logger

  /**
   * Connect to remote service and invoke service handler function on success.
   * @public
   * @method TCPConnector#connect
   * 
   * @param {String} host 
   * @param {uint16} port
   * @param {Function} factory 
   * 
   * @returns {ServiceHandler}
   */
  const connect = (address, port, factory) => {
    if (process.env.ARSDK_NET_DEBUG >= 1) {
      __log.info(`TCPConnector#connect() - Connecting to: ${address}:${port}`)
    }
    return new Promise((resolve, reject) => {
      const socket = new net.Socket()

      socket.setTimeout(4000);

      socket.on('timeout', () => {
        __log.error('TCPConnector#connect() - Connection timed out.')
        socket.destroy('CONNECTION_TIMEOUT')
      })

      socket.on('error', (error) => {
        if (error !== 'CONNECTION_TIMEOUT') __log.error('TCPConnector: Socket error:', error)
        reject(error)
      })

      socket.connect({ host: address, port },
          () => {
            if (process.env.ARSDK_NET_DEBUG >= 1) {
              __log.info(`TCPConnector#connect() - Connection established, initializing service handler.`)
            }
        
            return factory(socket).then(resolve).catch(reject)
          }
        )
    })
  }

  this.connect = connect
}

module.exports = { TCPConnector }