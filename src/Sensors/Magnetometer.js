
var Constants = require('../Constants'),
    SensorBase = require('../SensorBase'),
    Accelerometer = require('./Accelerometer');

/**
* A class representing the Magnetometer sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Magnetometer = function (sensorTag) {
    SensorBase.call(this, 
        "Magnetometer", 
        sensorTag, 
        Constants.MAGNETOMETER_UUID_DATA, 
        Constants.MAGNETOMETER_UUID_CONF, 
        Constants.MAGNETOMETER_UUID_PERIOD);
};

Magnetometer.prototype = new SensorBase();
Magnetometer.prototype.constructor = Magnetometer;

/**
* Sets the refresh period for notifications
* @param {Integer} sampleRate The sample rate in milliseconds
*/
Magnetometer.prototype.setPeriod = Accelerometer.prototype.setPeriod;

function scaleAxis(value) {
    return value * (2000.0 / 65336.0);
}

/**
* Calculates the coordinates
* @param {Array} data The raw sensor data
* @returns {Object} 
*/
Magnetometer.prototype.calculateCoordinates = function (data) {
    var m = new Int16Array(data);
    
    return {
        x: scaleAxis(m[0]),
        y: scaleAxis(m[1]),
        z: scaleAxis(m[2])
    };
};

module.exports = Magnetometer;
