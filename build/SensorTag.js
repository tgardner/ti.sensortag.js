(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = {
	GATT_CLIENT_CHAR_CFG_UUID: '00002902-0000-1000-8000-00805f9b34fb',

	ACCELEROMETER_UUID_SERVICE: "f000aa10-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_DATA: "f000aa11-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_CONF: "f000aa12-0451-4000-b000-000000000000",
	ACCELEROMETER_UUID_PERIOD: "f000aa13-0451-4000-b000-000000000000",
	
	BAROMETRICPRESSURE_UUID_SERVICE: "f000aa40-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_DATA: "f000aa41-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_CONF: "f000aa42-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_PERIOD: "f000aa44-0451-4000-b000-000000000000",
	BAROMETRICPRESSURE_UUID_CALIBRATION: "f000aa43-0451-4000-b000-000000000000",
	
	GYROSCOPE_UUID_SERVICE: "f000aa50-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_DATA: "f000aa51-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_CONF: "f000aa52-0451-4000-b000-000000000000",
	GYROSCOPE_UUID_PERIOD: "f000aa53-0451-4000-b000-000000000000",
	
	HUMIDITY_UUID_SERVICE: "f000aa20-0451-4000-b000-000000000000",
	HUMIDITY_UUID_DATA: "f000aa21-0451-4000-b000-000000000000",
    HUMIDITY_UUID_CONF: "f000aa22-0451-4000-b000-000000000000",
    HUMIDITY_UUID_PERIOD: "f000aa23-0451-4000-b000-000000000000",
    
    IRTEMPERATURE_UUID_SERVICE: "f000aa00-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_DATA: "f000aa01-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_CONF: "f000aa02-0451-4000-b000-000000000000",
    IRTEMPERATURE_UUID_PERIOD: "f000aa03-0451-4000-b000-000000000000",
    
    MAGNETOMETER_UUID_SERVICE: "f000aa30-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_DATA: "f000aa31-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_CONF: "f000aa32-0451-4000-b000-000000000000",
    MAGNETOMETER_UUID_PERIOD: "f000aa33-0451-4000-b000-000000000000",
    
    SIMPLEKEY_UUID_SERVICE: "0000ffe0-0000-1000-8000-00805f9b34fb",
    SIMPLEKEY_UUID_DATA: "0000ffe1-0000-1000-8000-00805f9b34fb"
};

},{}],2:[function(require,module,exports){

/**
* The base class representing each sensor
* @param {string} name The name of the sensor
* @param {SensorTag} sensorTag The SensorTag object this sensor belongs to
* @param {uuid} UUID_DATA The UUID of the data characteristic
* @param {uuid} UUID_CONF The UUID of the configuration characteristic
* @param {uuid} UUID_PERIOD The UUID of the period characteristic
*/
var SensorBase = function (name, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD) {
    this.identifier = name;

    this.sensorTag = sensorTag;
    this.UUID_DATA = UUID_DATA;
    this.UUID_CONF = UUID_CONF;
    this.UUID_PERIOD = UUID_PERIOD;

    this.enabled = false;

    this._handles = {
        config: null,
        period: null,
        data: null,
        notification: null
    };

    this._listeners = [];
};

/**
* Initializes the sensor with the SensorTag service information
* @param {service} service The SensorTag service object
*/
SensorBase.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci];
        switch (characteristic.uuid) {
            case this.UUID_CONF:
                this._handles.config = characteristic.handle;
                break;
            case this.UUID_PERIOD:
                this._handles.period = characteristic.handle;
                break;
            case this.UUID_DATA:
                this._handles.data = characteristic.handle;

                for (var di in characteristic.descriptors) {
                    var descriptor = characteristic.descriptors[di];
                    if (descriptor.uuid == GATT_CLIENT_CHAR_CFG_UUID) {
                        this._handles.notification = descriptor.handle;
                    }
                }
                break;
        }
    }
};

/**
* Logs a message on behalf of the sensor
* @param {string} message The message to log
*/
SensorBase.prototype.log = function (message) {
    this.sensorTag.log(this.identifier + ': ' + message);
};

/**
* Enables the sensor
* @param {Integer} [value] The value to initialize the sensor with
*/
SensorBase.prototype.enable = function (value) {
    var ON = 1,
        self = this;

    evothings.ble.writeCharacteristic(
        self.sensorTag.device,
        self._handles.config,
        new Uint8Array([value || ON]),
        function () {
            self.enabled = true;
        },
        function (errorCode) {
            self.log("enable error: " + errorCode);
        });
};

/**
* Disables the sensor
*/
SensorBase.prototype.disable = function () {
    var OFF = 0,
        self = this;

    evothings.ble.writeCharacteristic(
        self.sensorTag.device,
        self._handles.config,
        new Uint8Array([OFF]),
        function () {
            self.enabled = false;
        },
        function (errorCode) {
            self.log("disable error: " + errorCode);
        });
};

/**
* Enables notifications for the sensor
*/
SensorBase.prototype.enableNotifications = function () {
    var ENABLE_NOTIFICATIONS = [1, 0],
        self = this;

    evothings.ble.writeDescriptor(
        self.sensorTag.device,
        self._handles.notification,
        new Uint8Array(ENABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications enabled");
        },
        function (errorCode) {
            self.log("enableNotifications write error: " + errorCode);
        });

    evothings.ble.enableNotification(
        self.sensorTag.device,
        self._handles.data,
        function () {
            self.onDataNotify.apply(self, arguments);
        },
        function (errorCode) {
            self.log("enableNotifications subscribe error: " + errorCode);
        });
};

/**
* Disables notifications for the sensor
*/
SensorBase.prototype.disableNotification = function () {
    var DISABLE_NOTIFICATIONS = [0, 0],
        self = this;

    evothings.ble.writeDescriptor(
        self.sensorTag.device,
        self._handles.notification,
        new Uint8Array(DISABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications disabled");
        },
        function (errorCode) {
            self.log("disableNotification write error: " + errorCode);
        });

    evothings.ble.disableNotification(
        self.sensorTag.device,
        self._handles.data,
        function () {
            // Do nothing
        },
        function (errorCode) {
            self.log("disableNotification unsubscribe error: " + errorCode);
        });
};

/**
* Adds a notification listener
* @param {callback} callback The callback to receive updates from the sensor
* @returns {handle} The callback handle
*/
SensorBase.prototype.addListener = function (callback) {
    this._listeners.push(callback);

    // Return a handle
    return this._listeners.length - 1;
};

/**
* Removes a notification listener
* @param {handle} handle The handle for the callback
*/
SensorBase.prototype.removeListener = function (handle) {
    this._listeners.splice(handle, 1);
};

/**
* Notifies all the listeners
*/
SensorBase.prototype.onDataNotify = function () {
    for (var li in this._listeners) {
        var listener = this._listeners[li];
        listener.apply(this, arguments);
    }
};

module.exports = SensorBase;

},{}],3:[function(require,module,exports){

var Constants = require('./Constants.js');

/**
* A class representing the TI SensorTag
* @constructor
* @param {handle} device The device handle from the 
* evothings.ble connection object
*/
var SensorTag = function (device) {
    this.device = device;
    this.services = [];

    this.Accelerometer = new SensorTag.Accelerometer(this);
    this.BarometricPressure = new SensorTag.BarometricPressure(this);
    this.Gyroscope = new SensorTag.Gyroscope(this);
    this.Humidity = new SensorTag.Humidity(this);
    this.IRTemperature = new SensorTag.IRTemperature(this);
    this.Magnetometer = new SensorTag.Magnetometer(this);
    this.SimpleKey = new SensorTag.SimpleKey(this);
};

SensorTag.Accelerometer = require('./Sensors/Accelerometer.js');
SensorTag.BarometricPressure = require('./Sensors/BarometricPressure.js');
SensorTag.Gyroscope = require('./Sensors/Gyroscope.js');
SensorTag.Humidity = require('./Sensors/Humidity.js');
SensorTag.IRTemperature = require('./Sensors/Humidity.js');
SensorTag.Magnetometer = require('./Sensors/Humidity.js');
SensorTag.SimplyKey = require('./Sensors/SimpleKey');

/**
* Logs a message on behalf of the SensorTag
* @param {string} message The message to log
*/
SensorTag.prototype.log = function (message) {
    console.log('SensorTag #' + this.device + ' ' + message);
};

/**
* Initializes all of the discovered SensorTag sensors
*/
SensorTag.prototype.init = function () {
    var self = this;

    for (var i = 0; i < self.services.length; ++i) {
        var service = self.services[i];

        switch (service.uuid) {
            case Constants.ACCELEROMETER_UUID_SERVICE:
                self.Accelerometer.init(service);
                break;
                
            case Constants.BAROMETRICPRESSURE_UUID_SERVICE:
                self.BarometricPressure.init(service);
                break;
                
            case Constants.GYROSCOPE_UUID_SERVICE:
                self.Gyroscope.init(service);
                break;
                
            case Constants.HUMIDITY_UUID_SERVICE:
                self.Humidity.init(service);
                break;

            case Constants.IRTEMPERATURE_UUID_SERVICE:
                self.IRTemperature.init(service);
                break;

            case Constants.MAGNETOMETER_UUID_SERVICE:
                self.Magnetometer.init(service);
                break;

            case Constants.SIMPLEKEY_UUID_SERVICE:
                self.SimpleKey.init(service);
                break;
        }
    }

    self.log('Initialized');
};

// Traces async calls when building device tree.
var gCallTracer = 0;

function incrementCallTracer() {
    ++gCallTracer;
}

function decrementCallTracer() {
    --gCallTracer;
}

/**
* Discovers and initializes all the SensorTag sensors
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discover = function (win, fail) {
    var self = this;

    self.log('Discovering Services');

    incrementCallTracer();
    evothings.ble.services(
        self.device,
        function (services) {
            decrementCallTracer();

            self.services = services;

            for (var i = 0; i < services.length; ++i) {
                var service = services[i];

                self.discoverCharacteristics(service, win, fail);
            }

            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function (errorCode) {
            decrementCallTracer();
            self.log('Services error: ' + errorCode);

            if (fail !== undefined)
                fail.call(self, errorCode);
        });
};

/**
* Discovers all of the characteristics for the given service
* @param {service} service The service
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discoverCharacteristics = function (service, win, fail) {
    var self = this;

    incrementCallTracer();
    evothings.ble.characteristics(
        self.device,
        service.handle,
        function (characteristics) {
            decrementCallTracer();

            service.characteristics = characteristics;

            for (var j = 0; j < characteristics.length; ++j) {
                var characteristic = characteristics[j];

                self.discoverDescriptors(characteristic, win, fail);
            }

            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function (errorCode) {
            decrementCallTracer();
            self.log('Characteristics error: ' + errorCode);

            if (fail !== undefined)
                fail.call(self, errorCode);
        });
};

/**
* Discovers all of the descriptors for the given characteristic
* @param {characteristic} characteristic The characteristic
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discoverDescriptors = function (characteristic, win, fail) {
    var self = this;

    incrementCallTracer();
    evothings.ble.descriptors(
        self.device,
        characteristic.handle,
        function (descriptors) {
            decrementCallTracer();
            characteristic.descriptors = descriptors;

            if (gCallTracer === 0) {
                self.init();

                if (win !== undefined)
                    win.call(self);
            }
        },
        function (errorCode) {
            decrementCallTracer();
            self.log('Descriptors error: ' + errorCode);

            if (fail !== undefined)
                fail.call(self, errorCode);
        });
};

/**
* Closes the connection to the SensorTag
*/
SensorTag.prototype.close = function () {
    evothings.ble.close(this.device);
};

console.log(SensorTag);
module.exports = SensorTag;

},{"./Constants.js":1,"./Sensors/Accelerometer.js":4,"./Sensors/BarometricPressure.js":5,"./Sensors/Gyroscope.js":6,"./Sensors/Humidity.js":7,"./Sensors/SimpleKey":8}],4:[function(require,module,exports){

var Constants = require('../Constants.js'),
    SensorBase = require('../SensorBase.js');

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

	evothings.ble.writeCharacteristic(
			self.sensorTag.device,
			self._handles.period,
			new Uint8Array([period]),
			function () {
				self.log("Period set to " + sampleRate + "ms");
			},
			function (errorCode) {
				self.log("setPeriod error: " + errorCode);
			});
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

},{"../Constants.js":1,"../SensorBase.js":2}],5:[function(require,module,exports){

var Constants = require('../Constants.js'),
    SensorBase = require('../SensorBase.js');

/**
* A class representing the BarometricPressure sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var BarometricPressure = function (sensorTag) {
    SensorBase.call(this,
        "BarometricPressure",
        sensorTag, 
        BAROMETRICPRESSURE_UUID_DATA, 
        BAROMETRICPRESSURE_UUID_CONF, 
        BAROMETRICPRESSURE_UUID_PERIOD);

    this.calibration = [0, 0, 0, 0, 0, 0, 0, 0];
    this._handles.calibration = null;
};

BarometricPressure.prototype = new SensorBase();
BarometricPressure.prototype.constructor = BarometricPressure;

BarometricPressure.prototype.init = function (service) {
    for (var ci in service.characteristics) {
        var characteristic = service.characteristics[ci];
        switch (characteristic.uuid) {
            case Constants.BAROMETRICPRESSURE_UUID_CALIBRATION:
                this._handles.calibration = characteristic.uuid;
                break;
        }
    }

    SensorBase.prototype.init.call(this, service);
};

/**
* Reads the calibration data from the sensor
* @param {callback} win The success callback
* @param {callback} fail The failure callback
*/
BarometricPressure.prototype.readCalibration = function (win, fail) {
    var self = this,
        CALIBRATE = 2,
        error;
    
    error = function(description, errorCode) {
        self.log(description + ' error: ' + errorCode);

        if(fail !== undefined)
            fail.call(self, errorCode);
    };

    evothings.ble.writeCharacteristic(
        self.sensorTag.device,
        self._handles.config,
        new Uint8Array([CALIBRATE]),
        function () {

            evothings.ble.readCharacteristic(
                self.sensorTag.device,
                self._handles.calibration,
                function (data) {
                    self.calibration = new Uint16Array(data);

                    if (win !== undefined)
                        win.call(self, self.calibration);
                }, function (errorCode) {
                    error('readCalibration read', errorCode);
                });

        }, function (errorCode) {
            error('readCalibration write', errorCode);
        });
};

BarometricPressure.prototype.enable = function () {
    this.readCalibration(SensorBase.prototype.enable);
};

/** 
* Calculates the pressure
* @param {Array} data The raw sensor data
* returns {Number}
*/
BarometricPressure.prototype.calculatePressure = function (data) {
    var d = new Int16Array(data),
        t_r = d[0],
        p_r = d[1],
        t_a = (100 * (this.calibration[0] * t_r / Math.Pow(2, 8) +
            this.calibration[1] * Math.Pow(2, 6))) / Math.Pow(2, 16),
        S = this.calibration[2] + this.calibration[3] * t_r / Math.Pow(2, 17) +
            ((this.calibration[4] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 19),
        O = this.calibration[5] * Math.Pow(2, 14) + this.calibration[6] * t_r / Math.Pow(2, 3) +
            ((this.calibration[7] * t_r / Math.Pow(2, 15)) * t_r) / Math.Pow(2, 4);

    return (S * p_r + O) / Math.Pow(2, 14);
};

module.exports = BarometricPressure;

},{"../Constants.js":1,"../SensorBase.js":2}],6:[function(require,module,exports){

var Constants = require('../Constants.js'),
    SensorBase = require('../SensorBase.js');

/**
* A class representing the Gyroscope sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var Gyroscope = function (sensorTag) {
    SensorBase.call(this, 
        "Gyroscope", 
        sensorTag, 
        GYROSCOPE_UUID_DATA, 
        GYROSCOPE_UUID_CONF, 
        GYROSCOPE_UUID_PERIOD);

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

},{"../Constants.js":1,"../SensorBase.js":2}],7:[function(require,module,exports){

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

},{"../Constants.js":1,"../SensorBase.js":2}],8:[function(require,module,exports){

var Constants = require('../Constants.js'),
    SensorBase = require('../SensorBase.js');
    
/**
* A class representing the SimpleKey sensor
* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
*/
var SimpleKey = function (sensorTag) {
    SensorBase.call(this, 
        "SimpleKey", 
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

},{"../Constants.js":1,"../SensorBase.js":2}]},{},[3]);