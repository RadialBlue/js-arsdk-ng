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
function ARDrone3 (__connection) {
  const send = (command, params) => __connection.sendCommand('ardrone3.' + command, params)

  this.Common = {}
  this.Settings = {}

  this.Piloting = {}
  this.Piloting.TakeOff = () => send('Piloting.TakeOff')
  this.Piloting.Land = () => send('Piloting.Landing')
  this.Piloting.ReturnToHome = (enabled) => send('Piloting.NavigateHome', { start: enabled })
  this.Piloting.Loiter = (direction) => send('Piloting.Circle', { direction })
  this.Piloting.Emergency = () => send('Piloting.Emergency')

  this.PilotingSettings = {}
  this.PilotingSettings.SetMaxAltitude = (current) => send('PilotingSettings.MaxAltitude', { current })
  this.PilotingSettings.SetMaxTilt = (current) => send('PilotingSettings.MaxTilt', { current })
  this.PilotingSettings.SetMaxDistance = (value) => send('PilotingSettings.MaxDistance', { value })
  this.PilotingSettings.SetEnableGeofence = (shouldNotFlyOver) => send('PilotingSettings.NoFlyOverMaxDistance', { shouldNotFlyOver })

  this.SpeedSettings = {
    SetMaxVerticalSpeed: (current) => send('SpeedSettings.MaxVerticalSpeed', { current }),
    SetMaxRotationSpeed: (current) => send('SpeedSettings.MaxRotationSpeed', { current }),
    SetMaxPitchRollSpeed: (current) => send('SpeedSettings.MaxPitchRollRotationSpeed', { current }),
    HullProtection: (present) => send('SpeedSettings.HullProtection', { present }),
    Outdoor: (outdoor) => send('SpeedSettings.Outdoor', { outdoor }),
  }

  this.Camera = {}
  this.Camera.SetOrientation = (pan, tilt) => send('Camera.OrientationV2', { pan, tilt })
  this.Camera.SetVelocity = (pan, tilt) => send('Camera.Velocity', { pan, tilt })

  this.GPSSettings = {
    SetControllerGPS: (latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy)  =>
      send('GPSSettings.SendControllerGPS', { latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy }),
    SetHomeType: (type) => send('GPSSettings.HomeType', { type }),
    SetReturnHomeDelay: (delay) => send('GPSSettings.ReturnHomeDelay', { delay }),
    SetReturnAltitude: (value) => send('GPSSettings.ReturnHomeMinAltitude', { value })
  }

  this.MediaRecord = {
    TakePicture: () => send('MediaRecord.PictureV2'),
    RecordVideo: (state) => send('MediaRecord.VideoV2', { record: state }),
  }

  this.MediaStreaming = {
    SetVideoEnable: (enable) => send('MediaStreaming.VideoEnable', { enable }),
    SetVideoStreamMode: (mode) => send('MediaSettings.VideoStreamMode', { mode }),
  }

  this.Network = {}
  this.Network.WifiScan = (band) => send('Network.WifiScan', { band })
  this.Network.WifiAuthChannel = () => send('Network.WifiAuthChannel')

  this.NetworkSettings = {
    WifiSelection: (type, band, channel) => send('NetworkSettings.WifiSelection', { type, band, channel }),
    WifiSecurity: (type, key, keyType) => send('NetworkSettings.wifiSecurity', { type, key, keyType }),

  }

  this.PictureSettings = {
    SetPictureFormat: (type) => send('PictureSettings.PictureFormatSelection', { type }),
    SetWhiteBalanceMode: (type) => send('PictureSettings.AutoWhiteBalanceSelection', { type }),
    SetExposure: (value) => send('PictureSettings.ExpositionSelection', { value }),
    SetSaturation: (value) => send('PictureSettings.SaturationSelection', { value }),
    SetTimelapseMode: (enabled, interval) => send('PictureSettings.TimelapseSelection', { enabled, interval }),
    SetVideoAutoRecord: (enabled, mass_storage_id) => send('PictureSettings.VideAutorecordSelection', { enabled, mass_storage_id }),
    SetVideoStabilizationMode: (mode) => send('PictureSettings.VideoStabilizationMode', { mode }),
    SetVideoRecordingMode: (mode) => send('PictureSettings.VideoRecordingMode', { mode }),
    SetFramerate: (framerate) => send('PictureSettings.VideFramerate', { framerate }),
    SetResolutions: (type) => send('PictureSettings.VideoResolutions', { type }),
  }
}

ARDrone3.isPresent = (connection) => {
  return new Promise(resolve => {
    connection.sendCommand('common.Settings.AllSettings')
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

module.exports = ARDrone3