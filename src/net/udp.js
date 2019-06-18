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
const dgram = require('dgram')

/**
 * Manages the creation of an IPv4 datagram service socket.
 * 
 * @public
 * @class
 */
function UDPAcceptor () {
  /**
   * Create and bind transport socket.
   * @public
   * @method UDPAcceptor#create
   * 
   * @param {Function} factory Servhce handler factory method.
   * 
   * @returns {ServiceHandler}
   */
  const create = async (factory) => {
    const __socket = dgram.createSocket('udp4')
    await new Promise(resolve => __socket.bind(resolve))
    return await factory(__socket)
  }

  this.create = create
}

module.exports = { UDPAcceptor }