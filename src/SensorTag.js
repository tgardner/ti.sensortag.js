
var Constants = require('./Constants');

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

SensorTag.Accelerometer = require('./Sensors/Accelerometer');
SensorTag.BarometricPressure = require('./Sensors/BarometricPressure');
SensorTag.Gyroscope = require('./Sensors/Gyroscope');
SensorTag.Humidity = require('./Sensors/Humidity');
SensorTag.IRTemperature = require('./Sensors/Humidity');
SensorTag.Magnetometer = require('./Sensors/Magnetometer');
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

module.exports = SensorTag;
