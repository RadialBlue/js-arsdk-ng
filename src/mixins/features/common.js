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
function Common (__connection) {
  const send = (mesg, params) => __connection.sendCommand('common.' + mesg, params)

  this.Common = {
    AllStates: () => send('Common.AllStates'),
    SetCurrentDate: (date) => send('Common.CurrentDate', { date: date.toISOString() }),
    SetCurrentTime: (time) => send('Common.CurrentTime', { time: time.toISOString() }),
    Reboot: () => send('Common.Reboot')
  }

  this.Factory = {
    Reset: () => send('Factory.Reset')
  }

  this.Controller = {
    SetIsPiloting: (piloting) => send('Controller.isPiloting', { piloting })
  }

  this.WifiSettings = {
    SetOutdoor: (outdoor) => send('WifiSettings.OutdoorSetting', { outdoor })
  }

  this.Mavlink = {
    Start: (filepath, type) => send('Mavlink.Start', { filepath, type }),
    Pause: () => send('Mavlink.Pause'),
    Stop: () => send('Mavlink.Stop'),
  }

  this.FlightPlanSettings = {
    ReturnHomeOnDisconnect: (value) => send('FlightPlanSettings.ReturnHomeOnDisconnect', { value }),
  }

  this.Calibration = {
    MagnetoCalibration: (calibrate) => send('Calibration.MagnetoCalibration', { calibrate }),
    PitotCalibration: (calibrate) => send('Calibration.PitotCalibration', { calibrate }),
  }
}

Common.isPresent = (connection) => {
  return new Promise(resolve => {
    connection.sendCommand('common.Common.AllStates')
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

module.exports = Common