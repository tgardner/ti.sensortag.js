
/**
* A class representing the BarometricPressure sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.BarometricPressure = function (sensorTag) {
    var UUID_DATA = "f000aa41-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa42-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa44-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.UUID_CALIBRATION = "f000aa43-0451-4000-b000-000000000000";

    this.identifier = "BarametricPressure";
    this.calibration = [0, 0, 0, 0, 0, 0, 0, 0];
    this._handles.calibration = null;
};

SensorTag.BarometricPressure.UUID_SERVICE = "f000aa40-0451-4000-b000-000000000000";

SensorTag.BarometricPressure.prototype = new SensorTag.SensorBase();
SensorTag.BarometricPressure.prototype.constructor = SensorTag.BarometricPressure;

SensorTag.BarometricPressure.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci];
        switch (characteristic.uuid) {
            case this.UUID_CALIBRATION:
                this._handles.calibration = characteristic.uuid;
                break;
        }
    }

    SensorTag.SensorBase.prototype.init.call(this, service);
};

/**
* Reads the calibration data from the sensor
* @param {callback} win The success callback
* @param {callback} fail The failure callback
*/
SensorTag.BarometricPressure.prototype.readCalibration = function (win, fail) {
    var self = this,
        CALIBRATE = 2,
        error;
    
    error = function(description, errorCode) {
        self.log(description + ' error: ' + errorCode);

        if(fail !== undefined)
            fail.call(self, errorCode);
    };

    evothings.ble.writeCharacteristic(
        self.sensorTag.device,
        self._handles.config,
        new Uint8Array([CALIBRATE]),
        function () {

            evothings.ble.readCharacteristic(
                self.sensorTag.device,
                self._handles.calibration,
                function (data) {
                    self.calibration = new Uint16Array(data);

                    if (win !== undefined)
                        win.call(self, self.calibration);
                }, function (errorCode) {
                    error('readCalibration read', errorCode);
                });

        }, function (errorCode) {
            error('readCalibration write', errorCode);
        });
};

SensorTag.BarometricPressure.prototype.enable = function () {
    this.readCalibration(SensorBase.prototype.enable);
};

/** 
* Calculates the pressure
* @param {Array} data The raw sensor data
* returns {Number}
*/
SensorTag.BarometricPressure.prototype.calculatePressure = function (data) {
    var d = new Int16Array(data),
        t_r = d[0],
        p_r = d[1],
        t_a = (100 * (this.calibration[0] * t_r / Math.Pow(2, 8) +
            this.calibration[1] * Math.Pow(2, 6))) / Math.Pow(2, 16),
        S = this.calibration[2] + this.calibration[3] * t_r / Math.Pow(2, 17) +
            ((this.calibration[4] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 19),
        O = this.calibration[5] * Math.Pow(2, 14) + this.calibration[6] * t_r / Math.Pow(2, 3) +
            ((this.calibration[7] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 4);

    return (S * p_r + O) / Math.Pow(2, 14);
};
