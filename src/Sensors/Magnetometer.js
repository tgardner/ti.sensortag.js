
/**
* A class representing the Magnetometer sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.Magnetometer = function (sensorTag) {
    var UUID_DATA = "f000aa31-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa32-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa33-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.identifier = "Magnetometer";
};

SensorTag.Magnetometer.UUID_SERVICE = "f000aa30-0451-4000-b000-000000000000";

SensorTag.Magnetometer.prototype = new SensorTag.SensorBase();
SensorTag.Magnetometer.prototype.constructor = SensorTag.Magnetometer;

/**
* Sets the refresh period for notifications
* @param {Integer} sampleRate The sample rate in milliseconds
*/
SensorTag.Magnetometer.prototype.setPeriod = SensorTag.Accelerometer.prototype.setPeriod;

/**
* Calculates the coordinates
* @param {Array} data The raw sensor data
* @returns {Object} 
*/
SensorTag.Magnetometer.prototype.calculateCoordinates = function (data) {
    var m = new Int16Array(data),
        scaleAxis;

    scaleAxis = function (axis) {
        return axis * (2000.0 / 65536.0);
    };

    return {
        x: scaleAxis(m[0]),
        y: scaleAxis(m[1]),
        z: scaleAxis(m[2])
    };
};
