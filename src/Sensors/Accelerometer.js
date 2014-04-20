
var Constants = require('../Constants'),
    SensorBase = require('../SensorBase');

/** 
 * A class representing the Accelerometer sensor
 * @param {SensorTag} sensorTag The SensorTag this sensor belongs to
 */
var Accelerometer = function (sensorTag) {
	SensorBase.call(this, 
			"Accelerometer", 
			sensorTag, 
			Constants.ACCELEROMETER_UUID_DATA, 
			Constants.ACCELEROMETER_UUID_CONF, 
			Constants.ACCELEROMETER_UUID_PERIOD);
};

Accelerometer.prototype = new SensorBase();
Accelerometer.prototype.constructor = Accelerometer;

/**
 * Sets the refresh period for notifications
 * @param {Integer} sampleRate The sample rate in milliseconds
 */
Accelerometer.prototype.setPeriod = function (sampleRate) {
	// The period is in 10ms increments
	var period = Math.round(sampleRate / 10),
		self = this;

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.period,
        new Uint8Array([period]),
        function () {
            self.log("Period set to " + sampleRate + "ms");
        },
        function (errorCode) {
            self.log("setPeriod error: " + errorCode);
        }
    );
};

function getAxisAcceleration(value, scale) {
	// The precision in g's
	var precision = 1.0 / 64.0,
		s = scale || 1.0,
		a = value * s * precision;

	return Math.round(a * 100) / 100;
}

/**
 * Calculates the acceleration in terms of g
 * @param {Array} data The raw sensor data
 * @param {Number} [scale] The scaling coefficient
 * @returns {Object} 
 */
Accelerometer.prototype.calculateAcceleration = function (data, scale) {
	var a = new Int8Array(data);

	return {
		x: getAxisAcceleration(a[0], scale),
		y: getAxisAcceleration(a[1], scale),
		z: getAxisAcceleration(a[2], scale)
	};
};

module.exports = Accelerometer;
