
/**
* A class representing the SimpleKey sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.SimpleKey = function (sensorTag) {
    var UUID_DATA = "0000ffe1-0000-1000-8000-00805f9b34fb";

    SensorTag.SensorBase.prototype.constructor.call(this, UUID_DATA);

    this.identifier = "SimpleKey";
};

SensorTag.SimpleKey.UUID_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb";
SensorTag.SimpleKey.Keys = {
    RIGHT: 0x01,
    LEFT: 0x02,
    CENTER: 0x04
};

SensorTag.SimpleKey.prototype = new SensorTag.SensorBase();
SensorTag.SimpleKey.prototype.constructor = SensorTag.SimpleKey;

// Remove unsupported prototype functions
delete SensorTag.SimpleKey.prototype.enable;
delete SensorTag.SimpleKey.prototype.disable;
