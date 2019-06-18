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
 * Returns a hexadecimal formatted string, spaced at byte bounderies.
 * @protected
 * @function
 * 
 * @param {Buffer} buffer 
 * 
 * @returns {String} Formatted string of hexidecimal bytes with spacing.
 */
const HEX_DUMP = (buffer) => buffer.toString('hex').replace(/([0-9a-fA-F]{2})/g, '$1 ')

/**
 * Create a generator function for handling frame buffer sequence id generation.
 * 
 * @protected
 * @function
 * 
 * @params {Integer} [max] Maximum value
 * @params {Object} [seq] Initializer
 * 
 * @returns {Function} Generator function
 */
const SequenceCounter = (max = 255, seq = {}) => (bufferId) => {
  if (!(bufferId in seq) || seq[bufferId] > max)  seq[bufferId] = 0
  return seq[bufferId]++
}

module.exports = { HEX_DUMP, SequenceCounter }