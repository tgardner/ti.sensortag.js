
/**
* A class representing the IR Temperature sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
SensorTag.IRTemperature = function (sensorTag) {
    var UUID_DATA = "f000aa01-0451-4000-b000-000000000000",
        UUID_CONF = "f000aa02-0451-4000-b000-000000000000",
        UUID_PERIOD = "f000aa03-0451-4000-b000-000000000000";

    SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

    this.identifier = "IRTemperature";
    this.scale = SensorTag.IRTemperature.Scale.Celcius;
};

SensorTag.IRTemperature.UUID_SERVICE = "f000aa00-0451-4000-b000-000000000000";

SensorTag.IRTemperature.prototype = new SensorTag.SensorBase();
SensorTag.IRTemperature.prototype.constructor = SensorTag.IRTemperature;

/**
* Scales the given temperature
* @param {Number} t The temperature
* @param {SensorTag.IRTemperature.Scale} [scale] The scale
*/
SensorTag.IRTemperature.prototype.scaleTemperature = function (t, scale) {
    scale = scale || this.scale;

    switch (scale) {
        case SensorTag.IRTemperature.Scale.Farenheit:
            t = t * 1.8 + 32.0;
            break;
    }

    return t;
};

/**
* Calculates the ambient temperature
* @param {Array} data The raw sensor data
* @param {SensorTag.IRTemperature.Scale} [scale] The scale
* @returns {Number} 
*/
SensorTag.IRTemperature.prototype.calculateAmbientTemperature = function (data, scale) {
    var t = new Int16Array(data),
        temperature = t[1] / 128.0;

    return this.scaleTemperature(temperature, scale);
};

/**
* Calculates the target temperature
* @param {Array} data The raw sensor data
* @param {SensorTag.IRTemperature.Scale} [scale] The scale
* @returns {Number} 
*/
SensorTag.IRTemperature.prototype.calculateTargetTemperature = function (data, scale) {
    var ambientTemperature = this.calculateAmbientTemperature(data, SensorTag.IRTemperature.Scale.Celcius),
        t = new Int16Array(data),
        Vobj2 = t[0] * 0.00000015625,
        Tdie = ambientTemperature + 273.15,
        S0 = 5.593E-14,
        a1 = 1.75E-3,
        a2 = -1.678E-5,
        b0 = -2.94E-5,
        b1 = -5.7E-7,
        b2 = 4.63E-9,
        c2 = 13.4,
        Tref = 298.15,
        S = S0 * (1 + a1 * (Tdie - Tref) + a2 * Math.Pow((Tdie - Tref), 2)),
        Vos = b0 + b1 * (Tdie - Tref) + b2 * Math.Pow((Tdie - Tref), 2),
        fObj = (Vobj2 - Vos) + c2 * Math.Pow((Vobj2 - Vos), 2),
        tObj = Math.Pow(Math.Pow(Tdie, 4) + (fObj / S), 0.25) - 273.15;

    return this.scaleTemperature(tObj, scale);
};

SensorTag.IRTemperature.Scale = {
    Celcius: 0,
    Farenheit: 1,
};
