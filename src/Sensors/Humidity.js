
var Constants = require('../Constants.js'),
    SensorBase = require('../SensorBase.js');

/**
* A class representing the Humidity sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Humidity = function (sensorTag) {
    SensorBase.call(this, 
        "Humidity",
        sensorTag, 
        HUMIDITY_UUID_DATA, 
        HUMIDITY_UUID_CONF, 
        HUMIDITY_UUID_PERIOD);
};

Humidity.prototype = new SensorBase();
Humidity.prototype.constructor = Humidity;

/**
* Calculates the humidity as a percentage
* @param {Array} data The raw sensor data
* @returns {Number} 
*/
Humidity.prototype.calculateHumidity = function (data) {
    var a = new Uint16Array(data),
        hum;
        
    // bits [1..0] are status bits and need to be cleared according 
    // to the userguide, but the iOS code doesn't bother. It should
    // have minimal impact.
    hum = a[1] - (a[1] % 4);

    return -6.0 + 125.0 * (hum / 65535.0);
};

module.exports = Humidity;
