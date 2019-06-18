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
 */
function CommandQueue (matchfunc) {
  const __queue = []

  /**
   * @public
   * @method CommandQueue#dequeue
   */
  const dequeue =  () => __queue.shift()

  /**
   * @public
   * @method CommandQueue#enqueue
   * 
   * @param {*} mesg 
   * @param {*} opts 
   */
  const enqueue = (obj, opts) => {
    const replaceId = __queue.findIndex((v,i,a) => matchfunc(obj, v))

    if (replaceId !== -1) {
      __queue.splice(replaceId, 1, obj)
    } else {
      __queue.push(obj)
    }
  }

  /**
   * @public
   * @method CommandQueue#expire
   */
  const expire = (obj) => {
    const expireId = __queue.findIndex((v, i, a) => matchfunc(obj, v))
    __queue.splice(expireId, 1)
  }

  /**
   * @public
   * @method CommandQueue#front
   */
  const front = () => __queue[0]

  /**
   * @public
   * @method CommandQueue#clear
   */
  const clear = () => __queue.splice(0, __queue.length)

  // Interface
  this.dequeue = dequeue
  this.enqueue = enqueue
  this.expire = expire
  this.front = front
  this.clear = clear
}

/**
 *   Implements ARSDK command and response dispatching. Decodes/Encodes
 * incoming and outgoing messages and queues requests. Requires {@link Protocol} to
 * also be mixed-in to Connection instance to operate.
 * 
 * @public
 * @mixin
 * 
 * @param {CommandDict} __messages 
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 * 
 */
function Messaging (__messages, __opts) {
  __opts = Object.assign({
  }, __opts || {})

  const __self = this

  const __log = __opts.logger || console

  const __queue = new CommandQueue((a, b) =>
    a.minfo.featureId === b.minfo.featureId &&
    a.minfo.classId === b.minfo.classId &&
    a.minfo.messageId === b.minfo.messageId
  )

  let __is_waiting = false
  const __responses = []

  /**
   * Send a command through remote connection, if the command expects a result,
   * resolves when response/s are received. Otherwise resolves immediately.
   * 
   * @public
   * @method Messaging#sendCommand
   * 
   * @param {MessageInfo} minfo 
   * @param {Object} params 
   * 
   * @returns {Promise}
   */
  // XXX - Implement request timeout...
  const sendCommand = (minfo, params, dequeue) => {
    params = Object.assign({
      timeout: 5000,
    }, params || {})

    if (typeof minfo === 'string') minfo = __messages.resolve(minfo)
    if (!minfo) { throw 'UNKNOWN_COMMAND' }

    return new Promise((resolve, reject) => {
      __queue.enqueue({ minfo, params, resolve, reject })
      processQueue()
    })
  }

  const processQueue = async () => {
    while (!__is_waiting && __queue.front()) {
      const { minfo, params, resolve, reject } = __queue.front()
      const { featureId, classId, messageId, bufferId, expects } = minfo

      __self.sendMessage(
        featureId, classId, messageId, bufferId,
        minfo.encode(params)
      )

      //   If we don't expect any kind of return value, then immediately dequeue
      // and resolve.
      if (!expects || !expects.immediate) {
        __queue.dequeue()
        resolve()
      } else {
        __is_waiting = true

        if (params.timeout) {
          params.timeout_id = setTimeout(() => {
            __queue.expire(__queue.front())

            __responses.splice(0, __responses.length)
            __is_waiting = false

            reject('MESSAGE_TIMEOUT')
          }, params.timeout)
        }

        return
      }
    }
  }

  /**
   * @param {*} message
   */
  const onCommandNoAck = (mesg) => {
    const minfo = __messages.resolve(mesg)
    if (!minfo) {
      if (process.env.ARSDK_NET_DEBUG >= 3) {
        __log.info('  DROPPED\n')
      }
      return
    }

    mesg.info = minfo
    mesg.path = minfo.path
    mesg.params = minfo.decode(mesg.args)

    if (process.env.ARSDK_NET_DEBUG >= 2) {
      __log.info(`  RESOLVE - ${mesg.path} (${JSON.stringify(mesg.params)})\n`)
    }

    __self.emit('message:command', mesg)
  }

  /**
   * @param {*} message 
   */
  const onCommandWithAck = (mesg) => {
    const minfo = __messages.resolve(mesg)
    if (!minfo) {
      if (process.env.ARSDK_NET_DEBUG >= 3) {
        __log.info('  DROPPED\n')
      }
      return
    }

    mesg.info = minfo
    mesg.path = minfo.path
    mesg.params = minfo.decode(mesg.args)

    if (process.env.ARSDK_NET_DEBUG >= 2) {
      __log.info(`  RESOLVE - ${mesg.path} (${JSON.stringify(mesg.params)})\n`)
    }

    //   If request processing queue is empty. Nothing more to do except notify
    // application layer.
    if (!__is_waiting) {
      __self.emit('message:event', mesg)
      return
    }

    const { minfo: rinfo, params, resolve } = __queue.front()

    // If this message is the one we're expecting.
    if (mesg.match.apply(mesg, rinfo.expects.immediate)) {
      if (params.timeout_id) clearTimeout(params.timeout_id)

      // If we're expecting a LIST or MAP of items, then handle them and
      // don't resolve until we get the last item flag. 0x02
      if (minfo.messageType === 'event' &&
        (minfo.event.type === 'LIST_ITEM' || minfo.event.type === 'MAP_ITEM')) {

        __responses.push(mesg)

        // Wait for the end of a list or map...
        if (mesg.params.list_flags !== 0x02) {
          __self.emit('message:event', mesg)
          return
        }
      } else if (Object.keys(mesg.params).length !== 0) {
        //   Otherwise, push this event message to responses buffer, and continue
        // waiting for expected response.
        __responses.push(mesg)
      }

      __is_waiting = false
      __queue.dequeue()

      __self.emit('message:event', mesg)
      resolve(__responses.splice(0, __responses.length))

      processQueue()
      return
    }

    __responses.push(mesg)
    __self.emit('message:event', mesg)
  }

  this.sendCommand = sendCommand

  this.on('close', () => {
    __is_waiting = false
    let item = __queue.dequeue()
    while(item) {
      console.info('rejecting: ', item)
      item.reject()
      item = __queue.dequeue()
    }
  })

  this.on('message:nack', onCommandNoAck)
  this.on('message:wack', onCommandWithAck)
}

module.exports = Messaging