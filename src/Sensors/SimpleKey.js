
var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');
    
/**
* A class representing the SimpleKey sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var SimpleKey = function (sensorTag) {
    SensorBase.call(this, 
        "SimpleKey", 
        sensorTag,
        Constants.SIMPLEKEY_UUID_DATA);
};

SimpleKey.Keys = {
    RIGHT: 0x01,
    LEFT: 0x02,
    CENTER: 0x04
};

SimpleKey.prototype = new SensorBase();
SimpleKey.prototype.constructor = SimpleKey;

// Remove unsupported prototype functions
delete SimpleKey.prototype.enable;
delete SimpleKey.prototype.disable;

module.exports = SimpleKey;
