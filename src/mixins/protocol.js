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
const Codec = require('../codec.js')
const { HEX_DUMP, SequenceCounter } = require('../util.js')

/**
 *   Low-Level ARSDK network frame protocol implementation. Provides functions
 * for sending and dispatching received ARSDK Frame's and Message's. Also
 * responds to device PING requests and handles automatically acknowledging
 * received messages that require them.
 * 
 * @public
 * @mixin
 * 
 * @param {Object} params
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 * 
 */
function Protocol (__address, __port, __opts) {
  __opts = Object.assign({
  }, __opts || {})

  const __self = this

  const __log = __opts.logger || console

  const nextSeq = SequenceCounter()

  /**
   * Packs and sends an ARSDK network protocol Frame.
   * 
   * @public
   * @method Protocol#sendFrame
   * 
   * @param {uint8} type 
   * @param {uint8} id 
   * @param {uint8} seq 
   * @param {Buffer} payload 
   */
  const sendFrame = (type, id, seq, payload) => {
    const buffer = Codec.Frame.pack(type, id, seq, payload)
    __self.send(buffer, __port, __address)

    if (process.env.ARSDK_NET_DEBUG >= 4) {
      __log.info(`${__address}:${__port} <-- ${HEX_DUMP(buffer)}`)
    }

    if (process.env.ARSDK_NET_DEBUG >= 3) {
      __log.info(`  FRAME - [ Type: ${type}, Id: ${id}, Seq: ${seq}, Payload: ${HEX_DUMP(payload)}]`)
    }
  }

  /**
   * Packs and sends an ARSDK network protocol message Frame.
   * 
   * @public
   * @method Protocol#sendMessage
   * 
   * @param {uint8} featureId 
   * @param {uint8} classId 
   * @param {uint16} messageId 
   * @param {uint8} bufferId 
   * @param {Buffer} args 
   * 
   */
  const sendMessage = (featureId, classId, messageId, bufferId, args) => {
    sendFrame(
      Codec.ARSDK_FRAME_TYPE_DATA,
      bufferId,
      nextSeq(bufferId || 0x0b),
      Codec.Message.pack(featureId, classId, messageId, args))

    if (process.env.ARSDK_NET_DEBUG >= 3) {
      __log.info(`  MESSAGE - [ feature: ${featureId}, class: ${classId}, messageId: ${messageId} ]\n`)
    }
  }

  /**
   * Packs and sends an ARSDK network protocol event Frame.
   * 
   * @public
   * @method Protocol#sendEvent
   * 
   * @param {uint8} featureId 
   * @param {uint8} classId 
   * @param {uint16} messageId 
   * @param {uint8} bufferId 
   * @param {Buffer} args 
   */
  const sendEvent = (featureId, classId, messageId, bufferId, args) => {
    throw 'NOT_IMPLEMENTED'
  }

  /** @private */
  const onPing = (frame) => {
    if (process.env.ARSDK_NET_DEBUG >= 3) __log.info('  -- PING --\n')
    sendFrame(frame.type, Codec.ARSDK_TRANSPORT_ID_PONG, frame.seq, frame.payload)
    if (process.env.ARSDK_NET_DEBUG >= 3) __log.info('  -- PONG --\n')
  }

  /** @private */
  const onCommandNoAck = (frame) => {
    const mesg = Codec.Message.unpack(frame.payload)
    if (process.env.ARSDK_NET_DEBUG >= 3) {
      __log.info(`  MESSAGE - [ feature: ${mesg.featureId}, class: ${mesg.classId}, messageId: ${mesg.messageId} ]`)
    }

    __self.emit('message:nack', mesg)
  }

  /** @private */
  const onCommandWithAck = (frame) => {
    const mesg = Codec.Message.unpack(frame.payload)
    if (process.env.ARSDK_NET_DEBUG >= 3) {
      __log.info(`  EVENT - [ feature: ${mesg.featureId}, class: ${mesg.classId}, messageId: ${mesg.messageId} ]`)
    }

    __self.emit('message:wack', mesg)

    // Immediately send ACK frame
    sendFrame(
      Codec.ARSDK_FRAME_TYPE_ACKNOWLEDGE,
      frame.id + Codec.ARSDK_TRANSPORT_ID_ACKOFF,
      nextSeq(Codec.ARSDK_TRANSPORT_ID_C2D_CMD_ACK),
      Buffer.alloc(1, frame.seq)
    )
    if (process.env.ARSDK_NET_DEBUG >= 3) {
      __log.info('  -- ACKNOWLEDGE --\n')
    }
  }

  /** @private */
  const onIncomingMessage = (mesg, rinfo) => {
    if (process.env.ARSDK_NET_DEBUG >= 4) {
      __log.info(`${rinfo.address}:${rinfo.port} --> ${HEX_DUMP(mesg)}`)
    }

    let offset = 0
    while (offset < mesg.length) {
      const frame = Codec.Frame.unpack(mesg, offset)

      if (process.env.ARSDK_NET_DEBUG >= 3) {
        __log.info(`  FRAME - [ Type: ${frame.type}, Id: ${frame.id}, Seq: ${frame.seq}, Length: ${frame.length}, Payload: ${HEX_DUMP(frame.payload)}]`)
      }

      offset += frame.length

      switch (frame.id) {
        case Codec.ARSDK_TRANSPORT_ID_PING:
          onPing(frame)
          break
  
        case Codec.ARSDK_TRANSPORT_ID_D2C_CMD_NOACK:
          onCommandNoAck(frame)
          break
  
        case Codec.ARSDK_TRANSPORT_ID_D2C_CMD_WITHACK:
          onCommandWithAck(frame)
          break
  
        default:
          if (process.env.ARSDK_NET_DEBUG >= 1) {
            __log.warn('  DROPPED\n')
          }
      }

      __self.emit('frame', frame)
    }
  }

  // Interface
  this.sendFrame = sendFrame
  this.sendMessage = sendMessage
  this.sendEvent = sendEvent

  // Initialize
  this.on('message', onIncomingMessage)
}

module.exports = Protocol