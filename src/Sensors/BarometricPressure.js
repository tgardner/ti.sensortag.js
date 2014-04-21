
var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/**
* A class representing the BarometricPressure sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var BarometricPressure = function (sensorTag) {
    SensorBase.call(this,
        "BarometricPressure",
        sensorTag, 
        Constants.BAROMETRICPRESSURE_UUID_DATA, 
        Constants.BAROMETRICPRESSURE_UUID_CONF, 
        Constants.BAROMETRICPRESSURE_UUID_PERIOD);

    this.calibration = [0, 0, 0, 0, 0, 0, 0, 0];
    this.characteristics.calibration = null;
};

BarometricPressure.prototype = new SensorBase();
BarometricPressure.prototype.constructor = BarometricPressure;

BarometricPressure.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci],
            cGuid = characteristic.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
        
        if(Constants.BAROMETRICPRESSURE_UUID_CALIBRATION.test(cGuid)) {
            this.characteristics.calibration = characteristic;
        }
    }

    SensorBase.prototype.init.call(this, service);
};

/**
* Reads the calibration data from the sensor
* @param {callback} win The success callback
* @param {callback} fail The failure callback
*/
BarometricPressure.prototype.readCalibration = function (win, fail) {
    var self = this,
        CALIBRATE = 2,
        error;
    
    error = function(description, errorCode) {
        self.log(description + ' error: ' + errorCode);

        if(fail !== undefined)
            fail.call(self, errorCode);
    };
    
    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([CALIBRATE]),
        function() {
            self.sensorTag.device.readCharacteristic(
                self.characteristics.calibration,
                function (data) {
                    self.calibration = new Uint16Array(data);

                    if (win !== undefined)
                        win.call(self, self.calibration);
                }, function (errorCode) {
                    error('readCalibration read', errorCode);
                }
            );
        },
        function (errorCode) {
            error('readCalibration write', errorCode);
        }
    );
};

BarometricPressure.prototype.enable = function () {
    this.readCalibration(SensorBase.prototype.enable);
};

/** 
* Calculates the pressure
* @param {Array} data The raw sensor data
* returns {Number}
*/
BarometricPressure.prototype.calculatePressure = function (data) {
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

module.exports = BarometricPressure;
