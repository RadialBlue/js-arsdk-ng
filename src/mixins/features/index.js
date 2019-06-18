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

const FEATURES = {
  ardrone3: require('./ardrone3.js'),
  common: require('./common.js'),
  drone_manager: require('./drone_manager.js'),
  mapper: require('./mapper.js'),
  rc: require('./rc.js'),
  skyctrl: require('./skyctrl.js'),
}

/**
 * Implements feature APIs and device event data buffer management.
 * 
 * @public
 * @mixin
 * 
 * @param {Object} [opts]
 * @param {Logger} [opts.logger=console]
 * 
 */
function Features (__opts) {
  __opts = Object.assign({
    logger: console
  }, __opts || {})

  const __self = this
  const __log = __opts.logger

  const __features = {}
  const __buffers = {}

  /**
   * @public
   * @method Features#hasFeature
   * 
   * @param {String} featureId
   * 
   * @returns {Boolean}
   */
  const hasFeature = async (featureId) => {
    if (!(featureId in FEATURES)) throw 'UNKNOWN_FEATURE'

    if (featureId in __features) return true
    if (featureId in __buffers) return true

    //   As a last resort, (because we've not seen any messages for this feature)
    // request feature plugin to do a check by sending some kind of request.
    return await FEATURES[featureId].isPresent(__self)
  }

  /**
   * @public
   * @method Features#GetInterface
   * 
   * @param {String} featureId 
   * 
   * @returns {FeatureInterface}
   */
  const GetInterface = (featureId) => {
    if (!(featureId in FEATURES)) throw 'UNKNOWN_FEATURE'
    if (featureId in __features) return __features[featureId]
    __features[featureId] = new FEATURES[featureId](__self)
    return __features[featureId]
  }

  /**
   * @public
   * @method Features#GetBuffer
   * 
   * @param {String} bufferId 
   * 
   * @returns {FeatureBuffer}
   */
  const GetBuffer = (bufferId) => {
    const featureId = bufferId.slice(0, bufferId.indexOf('.'))
    bufferId = bufferId.slice(bufferId.indexOf('.') + 1)

    if (!(featureId in __buffers)) return undefined
    return __buffers[featureId][bufferId]
  }

  /** @private */
  const onProjectMessage = (fId, cId, mId, mesg) => {
    const prop = [cId, mId.replace(/Changed$/, '')].join('.')
    if (!(fId in __buffers)) __buffers[fId] = {}
    __buffers[fId][prop] = mesg.params
    __self.emit('property:changed', fId, prop, mesg.params)
  }

  /** @private */
  const onFeatureMessage = (fId, cId, mId, mesg) => {
    const minfo = mesg.info

    if (!(fId in __buffers)) __buffers[fId] = {}
    const feature = __buffers[fId]

    if (minfo.messageType === 'event' && minfo.event.type) {
      if (minfo.event.type === 'LIST_ITEM') {
        // Process list initiator
        if (mesg.params.list_flags === 0x01) feature[mID] = []

        feature[mId].push(mesg.params)

        // Process list terminator
        if (mesg.params.list_flags === 0x02) {
          __self.emit('property:changed', fId, mId, feature[mId])
        }
      }
      if (minfo.event.type === 'MAP_ITEM') {
        const key = minfo.event.key

        // Process map initiator
        if (mesg.params.list_flags === 0x01) feature[mId] = {}

        feature[mId][mesg.params[key]] = mesg.params

        // Process map terminator
        if (mesg.params.list_flags === 0x02) {
          __self.emit('property:changed', fId, mId, feature[mId])
        }
      }
    } else {
      feature[mId] = mesg.params
      __self.emit('property:changed', fId, mId, mesg.params)
    }
  }

  /** @private */
  const onIncomingMessage = (mesg) => {
    const [ fId, cId, mId ] = mesg.path.split('.')

    const onMessage = mesg.info.isProject ? onProjectMessage : onFeatureMessage
    onMessage(fId, cId, mId, mesg)
  }

  this.on('message:command', onIncomingMessage)
  this.on('message:event', onIncomingMessage)

  // Public Interface
  this.hasFeature = hasFeature
  this.GetInterface = GetInterface
  this.GetBuffer = GetBuffer
}

module.exports = Features