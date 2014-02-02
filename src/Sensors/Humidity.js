
/**
* A class representing the Humidity sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.Humidity = function (sensorTag) {
    var UUID_DATA = "f000aa21-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa22-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa23-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.identifier = "Humidity";
};

SensorTag.Humidity.UUID_SERVICE = "f000aa20-0451-4000-b000-000000000000";

SensorTag.Humidity.prototype = new SensorTag.SensorBase();
SensorTag.Humidity.prototype.constructor = SensorTag.Humidity;

/**
* Calculates the humidity as a percentage
* @param {Array} data The raw sensor data
* @returns {Number} 
*/
SensorTag.Humidity.prototype.calculateHumidity = function (data) {
    var a = new Uint16Array(data),
        hum;
        
    // bits [1..0] are status bits and need to be cleared according 
    // to the userguide, but the iOS code doesn't bother. It should
    // have minimal impact.
    hum = a[1] - (a[1] % 4);

    return -6.0 + 125.0 * (hum / 65535.0);
};
