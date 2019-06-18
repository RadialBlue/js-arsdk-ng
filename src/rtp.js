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
const EventEmitter = require('events')
const { HEX_DUMP } = require('./util.js')

/**
 * @protected
 * @param {Buffer} data 
 */
const rtp_decode_header = (data) => {
  const version = (data[0] >> 6) & 0x03
  const padding = (data[0] >> 5) & 0x01
  const extension = (data[0] >> 4) & 0x01
  const cc = (data[0] >> 0) & 0x0f
  const marker = (data[1] >> 7) & 0x01
  const payload_type = (data[1] >> 0) & 0x7f
  const sequence = data.readUInt16BE(2)
  const timestamp = data.readUInt32BE(4)
  const ssrc = data.readUInt32BE(8)

  return {
    version, padding, extension, cc, marker, payload_type,
    sequence, timestamp, ssrc
  }
}

const rtcp_decode_header = (data) => {
  const version = (data[0] >> 6) & 0x03
  const padding = (data[0] >> 5) & 0x01
  const rc = (data[0] >> 0) & 0x1f
  const payload_type = data.readUInt8(1)
  const length = data.readUInt16BE(2)
  const ssrc = data.readUInt32BE(4)
  const tstamp_h = data.readUInt32BE(8)
  const tstamp_l = data.readUInt32BE(12)
  const timestamp = data.readUInt32BE(16)
  const packet_count = data.readUInt32BE(20)
  const octet_count = data.readUInt32BE(24)  

  return {
    version, padding, rc, payload_type, length,
    ssrc,
    tstamp_h, tstamp_l,
    timestamp,
    packet_count,
    octet_count
  }
}

/**
 * Implements a ServiceHandler for receiving RTP media streams.
 * 
 * @public
 * @class
 * 
 * @param {Connection} connection
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 */
function RTPClient (__connection, __opts) {
  __opts = Object.assign({
    logger: console,
  }, __opts || {})

  EventEmitter.call(this)

  const __self = this

  const onIncomingMessage = (data, rinfo) => {
    let header = rtp_decode_header(data.slice(0, 12))

    // Check to see if it's an RTCP packet.
    if (!(63 < header.payload_type && header.payload_type < 96)) return
    header = rtcp_decode_header(data)

    console.info('RTCP', header)
    console.info(HEX_DUMP(data))

    // RTCP Sender Report (SR) Packet
    if (header.payload_type === 200) {
      const report_count = header.cc
      console.info('RTCP [SR]')
      return
    }

    // RTCP Receiver Report (RR) Packet
    if (header.payload_type === 201) {
      const receiver_count = header.cc
      console.info('RTCP [RR]')
      return
    }

    // RTCP Source Description (SDES) Packat
    if (header.payload_type === 202) {
      const source_count = header.cc
      console.info('RTCP [SDES]')
      return
    }

    // RTCP Goodbye (BYE) Packet
    if (header.payload_type === 203) {
      const source_count = header.cc
      console.info('RTCP [BYE]')
      return
    }

    // RTCP Application Defined (APP) Packet
    if (header.payload_type === 204) {
      const subtype = header.cc
      console.info('RTCP [APP]')
      return
    }
  }

  /**
   * @public
   * @method RTPClient#init
   * 
   * @param {*} params 
   */
  const init = async (params) => {
    __connection.on('message', onIncomingMessage)
  }

  /**
   * @public
   * @method RTPClient#shutdown
   */
  const shutdown = async () => {
    try {
      __connection.close()
    } catch (error) {
      // Ignore
    }
  }

  this.port = __connection.address().port

  this.init = init
  this.shutdown = shutdown
}
RTPClient.prototype = Object.create(EventEmitter.prototype)

module.exports = { RTPClient }