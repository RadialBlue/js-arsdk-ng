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
 *   Watchdog that implements control connection inactivity timeout, which
 * triggers disconnection.
 * 
 * @public
 * @mixin
 * 
 * @param {Object} [opts]
 * @param {int} [opts.timeout=5000]
 * @param {Logger} [opts.logger=console]
 * 
 */
function Watchdog (__opts) {
  __opts = Object.assign({
    timeout: 5000
  }, __opts || {})

  const __self = this

  const __log = __opts.logger || console

  let __keepalive

  function reset () {
    clearTimeout(__keepalive)
    __keepalive = setTimeout(onTriggered, __opts.timeout)
  }

  function onTriggered () {
    __log.info("Watchdog triggered, closing socket.")
    __self.close()
  }

  this.on('close', () => clearTimeout(__keepalive))
  this.on('message', reset)
  reset()
}

module.exports = Watchdog
