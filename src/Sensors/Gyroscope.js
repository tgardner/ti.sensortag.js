
/**
* A class representing the Gyroscope sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.Gyroscope = function (sensorTag) {
    var UUID_DATA = "f000aa51-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa52-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa53-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.Axis = SensorTag.Gyroscope.Axis.XYZ;
    this.identifier = "Gyroscope";
};

SensorTag.Gyroscope.UUID_SERVICE = "f000aa50-0451-4000-b000-000000000000";
SensorTag.Gyroscope.Axis = {
    X: 1,
    Y: 2,
    XY: 3,
    Z: 4,
    XZ: 5,
    YZ: 6,
    XYZ: 7,
};

SensorTag.Gyroscope.prototype = new SensorTag.SensorBase();
SensorTag.Gyroscope.prototype.constructor = SensorTag.Gyroscope;

SensorTag.Gyroscope.prototype.enable = function () {
    SensorTag.SensorBase.prototype.enable.call(this, this.Axis);
};

/**
* Calculates the offset of the axis in degrees
* @param {Array} data The raw sensor data
* @returns {Number}
*/
SensorTag.Gyroscope.prototype.calculateAxisValue = function (data) {
    var v = new Int16Array(data),
        scaleAxis;

    // Converting from raw data to degrees/second.
    scaleAxis = function (raw) {
        // Calculate rotation, unit deg/s, range -250, +250
        var degrees = raw * (500.0 / 65536.0);

        // Round to 2 decimal places
        return Math.round(degrees * 100) / 100;
    };

    // x, y, z has a wierd order
    return {
        y: scaleAxis(v[0]),
        x: scaleAxis(v[1]),
        z: scaleAxis(v[2]),
    };
};
