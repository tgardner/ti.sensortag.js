
var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/**
* A class representing the Gyroscope sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Gyroscope = function (sensorTag) {
    SensorBase.call(this, 
        "Gyroscope", 
        sensorTag, 
        Constants.GYROSCOPE_UUID_DATA, 
        Constants.GYROSCOPE_UUID_CONF, 
        Constants.GYROSCOPE_UUID_PERIOD);

    this.Axis = Gyroscope.Axis.XYZ;
};

Gyroscope.Axis = {
    X: 1,
    Y: 2,
    XY: 3,
    Z: 4,
    XZ: 5,
    YZ: 6,
    XYZ: 7,
};

Gyroscope.prototype = new SensorBase();
Gyroscope.prototype.constructor = Gyroscope;

Gyroscope.prototype.enable = function () {
    SensorBase.prototype.enable.call(this, this.Axis);
};


// Converting from raw data to degrees/second.
function getDegreesPerSecond(value) {
    // Calculate rotation, unit deg/s, range -250, +250
    var d = value * (500.0 / 65536.0);
    
    // Round to 2 decimal places
    return Math.round(d * 100) / 100;
}

/**
* Calculates the offset of the axis in degrees
* @param {Array} data The raw sensor data
* @returns {Number}
*/
Gyroscope.prototype.calculateAxisValue = function (data) {
    var v = new Int16Array(data);
    
    // x, y, z has a wierd order
    return {
        y: getDegreesPerSecond(v[0]),
        x: getDegreesPerSecond(v[1]),
        z: getDegreesPerSecond(v[2]),
    };
};

module.exports = Gyroscope;
