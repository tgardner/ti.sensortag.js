
/** 
* A class representing the Accelerometer sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.Accelerometer = function (sensorTag) {
    var UUID_DATA = "f000aa11-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa12-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa13-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.identifier = "Accelerometer";
};

SensorTag.Accelerometer.UUID_SERVICE = "f000aa10-0451-4000-b000-000000000000";

SensorTag.Accelerometer.prototype = new SensorTag.SensorBase();
SensorTag.Accelerometer.prototype.constructor = SensorTag.Accelerometer;

/**
* Sets the refresh period for notifications
* @param {Integer} sampleRate The sample rate in milliseconds
*/
SensorTag.Accelerometer.prototype.setPeriod = function (sampleRate) {
    // The period is in 10ms increments
    var period = Math.round(sampleRate / 10),
        self = this;

    evothings.ble.writeCharacteristic(
        self.sensorTag.device,
        self._handles.period,
        new Uint8Array([period]),
        function () {
            self.log("Period set to " + sampleRate + "ms");
        },
        function (errorCode) {
            self.log("setPeriod error: " + errorCode);
        });
};

/**
* Calculates the acceleration in terms of g
* @param {Array} data The raw sensor data
* @param {Number} [scale] The scaling coefficient
* @returns {Object} 
*/
SensorTag.Accelerometer.prototype.calculateAcceleration = function (data, scale) {
    //The Accelerometer has the range [-2g, 2g] with unit (1/64)g.
    //To convert from unit (1/64)g to unit g we divide by 64.
    //http://processors.wiki.ti.com/index.php/SensorTag_User_Guide#Accelerometer
    var UNIT = 64.0,
        axisAcceleration;
    
    axisAcceleration = function (rawValue) {
        var s = scale || 1.0,
            acceleration = rawValue * s / UNIT;

        return Math.round(acceleration * 100) / 100;
    };

    var a = new Int8Array(data);

    return {
        x: axisAcceleration(a[0]),
        y: axisAcceleration(a[1]),
        z: axisAcceleration(a[2])
    };
};
