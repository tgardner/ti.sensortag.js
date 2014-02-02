
/**
* A class representing the TI SensorTag
* @constructor
* @param {handle} device The device handle from the 
* evothings.ble connection object
*/
var SensorTag = function (device) {
    this.device = device;

    this.Accelerometer = new SensorTag.Accelerometer(this);
    this.IRTemperature = new SensorTag.IRTemperature(this);
    this.Humidity = new SensorTag.Humidity(this);
    this.Magnetometer = new SensorTag.Magnetometer(this);
    this.BarometricPressure = new SensorTag.BarometricPressure(this);
    this.Gyroscope = new SensorTag.Gyroscope(this);
    this.SimpleKey = new SensorTag.SimpleKey(this);
};

/**
* Logs a message on behalf of the SensorTag
* @param {string} message The message to log
*/
SensorTag.prototype.log = function (message) {
    console.log('SensorTag #' + this.device + ' ' + message);
};

/**
* Discovers and initializes all the SensorTag sensors
* @param {callback} win A callback on success
* @param {callback} fail A callback on failure
*/
SensorTag.prototype.discover = function (win, fail) {
    var self = this,
        services = [],
        initialize,
        error;

    self.log('Discovering Services');

    initialize = function (services) {
        for (var si in services) {
            var service = services[si];
            switch (service.uuid) {
                case SensorTag.Accelerometer.UUID_SERVICE:
                    self.Accelerometer.init(service);
                    break;

                case SensorTag.IRTemperature.UUID_SERVICE:
                    self.IRTemperature.init(service);
                    break;

                case SensorTag.Humidity.UUID_SERVICE:
                    self.Humidity.init(service);
                    break;

                case SensorTag.Magnetometer.UUID_SERVICE:
                    self.Magnetometer.init(service);
                    break;

                case SensorTag.BarometricPressure.UUID_SERVICE:
                    self.BarometricPressure.init(service);
                    break;

                case SensorTag.Gyroscope.UUID_SERVICE:
                    self.Gyroscope.init(service);
                    break;

                case SensorTag.SimpleKey.UUID_SERVICE:
                    self.SimpleKey.init(service);
                    break;
            }
        }

        self.log('Initialized');

        if (win !== undefined)
            win.call(self);
    };

    error = function (description, errorCode) {
        self.log(description + ' error: ' + errorCode);

        if (fail !== undefined)
            fail.call(self, errorCode);
    };

    evothings.ble.services(self.device, function (service) {
        service.characteristics = [];

        if (service.characteristicCount === 0) {
            services.push(service);

            if (services.length == service.serviceCount)
                initialize(services, win);
        }

        evothings.ble.characteristics(self.device, service.handle, function (characteristic) {
            characteristic.descriptors = [];

            if (characteristic.descriptorCount === 0) {
                service.characteristics.push(characteristic);

                if (service.characteristics.length == service.characteristicCount)
                    services.push(service);

                if (services.length == service.serviceCount)
                    initialize(services, win);
            }

            evothings.ble.descriptors(self.device, characteristic.handle, function (d) {
                characteristic.descriptors.push(d);

                if (characteristic.descriptors.length == characteristic.descriptorCount)
                    service.characteristics.push(characteristic);

                if (service.characteristics.length == service.characteristicCount)
                    services.push(service);

                if (services.length == service.serviceCount)
                    initialize(services, win);
            }, function (errorCode) {
                error('Descriptor', errorCode);
            });
        }, function (errorCode) {
            error('Characteristic', errorCode);
        });
    }, function (errorCode) {
        error('Service', errorCode);
    });
};

/**
* Closes the connection to the SensorTag
*/
SensorTag.prototype.close = function () {
    evothings.ble.close(this.device);
};
