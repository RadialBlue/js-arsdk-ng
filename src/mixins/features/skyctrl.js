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
function SkyController (__connection) {
  const send = (command, params) => __connection.sendCommand('skyctrl.' + command, params)

  this.Common = {}
  this.Common.AllStates = () => send('Common.AllStates')
  this.Settings = {}
  this.Settings.AllSettings = () => send('Settings.AllSettings')
  this.CoPiloting = {}
  this.CoPiloting.SetPilotingSource = (source) => send('CoPiloting.setPilotingSource', { source })
  this.Calibration = {}
  this.Calibration.EnableMagnetoCalibrationQualityUpdates = (enable) => send('Calibration.enableMagnetoCalibrationQualityUpdates', { enable })
  this.Calibration.StartCalibration = () => send('Calibration.StartCalibration')
  this.Calibration.AbortCalibration = () => send('Calibration.AbortCalibration')
  this.Factory = {}
  this.Factory.Reset = () => __connection.send('Factory.Reset')
}

SkyController.isPresent = (connection) => {
  return new Promise(resolve => {
    connection.sendCommand('skyctrl.Common.AllStates')
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

module.exports = SkyController