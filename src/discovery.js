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
 * Creates handler for connection handshake initiation with remote device.
 * 
 * @public
 * @class
 * 
 * @param {Object} params
 * @param {uint16} params.d2c_port
 * @param {String} [params.controller_type=js-arsdk]
 * @param {String} [params.controller_name=HOSTNAME]
 * @param {uint16} [params.arstream2_client_stream_port]
 * @param {uint16} [params.arstream2_client_control_port]
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 * 
 * @returns {DiscoveryHandler}
 */
const DiscoveryFactory = (__params, opts = {}) => async (socket) => {
  const __log = opts.logger || console

  if (process.env.ARSDK_NET_DEBUG >= 1) {
    __log.info('DiscoveryHandler() - Sending discovery handshake parameters:')
    __log.info(JSON.stringify(__params, null, 2))
    __log.info()
  }

  socket.write(JSON.stringify(__params))

  let response = await new Promise((resolve) => socket.once('data', resolve))
  socket.end()

  // Strip EOT NULL terminator if present.
  response = (
    response[response.length - 1] === 0x00 ?
    response.slice(0, response.length - 1) :
    response
  ).toString('utf8')

if (process.env.ARSDK_NET_DEBUG >= 1) {
    __log.info('DiscoveryHandler() - Received handshake response:')
    __log.info(JSON.stringify(JSON.parse(response), null, 2))
    __log.info()
  }

  try {
    response = JSON.parse(response)
  } catch (error) {
    throw 'HANDSHAKE_PARSE_FAILURE'
  }

  if (response.status !== 0) {
    throw 'HANDSHAKE_FAILURE'
  }

  return response
}

module.exports = { DiscoveryFactory }