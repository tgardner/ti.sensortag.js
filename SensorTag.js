
(function (window, undefined) {
	'use strict';
	
    var GATT_CLIENT_CHAR_CFG_UUID = '00002902-0000-1000-8000-00805f9b34fb';

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



    /**
    * The base class representing each sensor
    * @param {SensorTag} sensorTag The SensorTag object this sensor belongs to
    * @param {uuid} UUID_DATA The UUID of the data characteristic
    * @param {uuid} UUID_CONF The UUID of the configuration characteristic
    * @param {uuid} UUID_PERIOD The UUID of the period characteristic
    */
    SensorTag.SensorBase = function (sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD) {
        this.identifier = "Sensor";

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
    SensorTag.SensorBase.prototype.init = function (service) {
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
    SensorTag.SensorBase.prototype.log = function (message) {
        this.sensorTag.log(this.identifier + ': ' + message);
    };

    /**
    * Enables the sensor
    * @param {Integer} [value] The value to initialize the sensor with
    */
    SensorTag.SensorBase.prototype.enable = function (value) {
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
    SensorTag.SensorBase.prototype.disable = function () {
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
    SensorTag.SensorBase.prototype.enableNotifications = function () {
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
    SensorTag.SensorBase.prototype.disableNotification = function () {
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
    SensorTag.SensorBase.prototype.addListener = function (callback) {
        this._listeners.push(callback);

        // Return a handle
        return this._listeners.length - 1;
    };

    /**
    * Removes a notification listener
    * @param {handle} handle The handle for the callback
    */
    SensorTag.SensorBase.prototype.removeListener = function (handle) {
        this._listeners.splice(handle, 1);
    };

    /**
    * Notifies all the listeners
    */
    SensorTag.SensorBase.prototype.onDataNotify = function () {
        for (var li in this._listeners) {
            var listener = this._listeners[li];
            listener.apply(this, arguments);
        }
    };



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



    /**
    * A class representing the Accelerometer sensor
    //* @param {SensorTag} sensorTag The SensorTag this sensor belongs to
    */
    SensorTag.Accelerometer = function (sensorTag) {
        var UUID_DATA = "f000aa11-0451-4000-b000-000000000000",
            UUID_CONF = "f000aa12-0451-4000-b000-000000000000",
            UUID_PERIOD = "f000aa13-0451-4000-b000-000000000000";

        SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

        this.identifier = "Accelerometer";
    };

    SensorTag.Accelerometer.UUID_SERVICE = "f000aa10-0451-4000-b000-000000000000";

    SensorTag.Accelerometer.prototype = new SensorTag.SensorBase();
    SensorTag.Accelerometer.prototype.constructor = SensorTag.Accelerometer;

    /**
    * Sets the refresh period for notifications
    * @param {Integer} sampleRate The sample rate in milliseconds
    */
    SensorTag.Accelerometer.prototype.setPeriod = function (sampleRate) {
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

    /**
    * Calculates the acceleration in terms of g
    * @param {Array} data The raw sensor data
    * @param {Number} [scale] The scaling coefficient
    * @returns {Object} 
    */
    SensorTag.Accelerometer.prototype.calculateAcceleration = function (data, scale) {
        //The Accelerometer has the range [-2g, 2g] with unit (1/64)g.
        //To convert from unit (1/64)g to unit g we divide by 64.
        //http://processors.wiki.ti.com/index.php/SensorTag_User_Guide#Accelerometer
        var UNIT = 64.0,
            axisAcceleration;
        
        axisAcceleration = function (rawValue) {
            var s = scale || 1.0,
                acceleration = rawValue * s / UNIT;

            return Math.round(acceleration * 100) / 100;
        };

        var a = new Int8Array(data);

        return {
            x: axisAcceleration(a[0]),
            y: axisAcceleration(a[1]),
            z: axisAcceleration(a[2])
        };
    };



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



    /**
    * A class representing the Magnetometer sensor
    * @param {SensorTag} sensorTag The SensorTag this sensor belongs to
    */
    SensorTag.Magnetometer = function (sensorTag) {
        var UUID_DATA = "f000aa31-0451-4000-b000-000000000000",
            UUID_CONF = "f000aa32-0451-4000-b000-000000000000",
            UUID_PERIOD = "f000aa33-0451-4000-b000-000000000000";

        SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

        this.identifier = "Magnetometer";
    };

    SensorTag.Magnetometer.UUID_SERVICE = "f000aa30-0451-4000-b000-000000000000";

    SensorTag.Magnetometer.prototype = new SensorTag.SensorBase();
    SensorTag.Magnetometer.prototype.constructor = SensorTag.Magnetometer;

    /**
    * Sets the refresh period for notifications
    * @param {Integer} sampleRate The sample rate in milliseconds
    */
    SensorTag.Magnetometer.prototype.setPeriod = SensorTag.Accelerometer.prototype.setPeriod;

    /**
    * Calculates the coordinates
    * @param {Array} data The raw sensor data
    * @returns {Object} 
    */
    SensorTag.Magnetometer.prototype.calculateCoordinates = function (data) {
        var m = new Int16Array(data),
            scaleAxis;

        scaleAxis = function (axis) {
            return axis * (2000.0 / 65536.0);
        };

        return {
            x: scaleAxis(m[0]),
            y: scaleAxis(m[1]),
            z: scaleAxis(m[2])
        };
    };



    /**
    * A class representing the BarometricPressure sensor
    * @param {SensorTag} sensorTag The SensorTag this sensor belongs to
    */
    SensorTag.BarometricPressure = function (sensorTag) {
        var UUID_DATA = "f000aa41-0451-4000-b000-000000000000",
            UUID_CONF = "f000aa42-0451-4000-b000-000000000000",
            UUID_PERIOD = "f000aa44-0451-4000-b000-000000000000";

        SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

        this.UUID_CALIBRATION = "f000aa43-0451-4000-b000-000000000000";

        this.identifier = "BarametricPressure";
        this.calibration = [0, 0, 0, 0, 0, 0, 0, 0];
        this._handles.calibration = null;
    };

    SensorTag.BarometricPressure.UUID_SERVICE = "f000aa40-0451-4000-b000-000000000000";

    SensorTag.BarometricPressure.prototype = new SensorTag.SensorBase();
    SensorTag.BarometricPressure.prototype.constructor = SensorTag.BarometricPressure;

    SensorTag.BarometricPressure.prototype.init = function (service) {
        for (var ci in service.characteristics) {
            var characteristic = service.characteristics[ci];
            switch (characteristic.uuid) {
                case this.UUID_CALIBRATION:
                    this._handles.calibration = characteristic.uuid;
                    break;
            }
        }

        SensorTag.SensorBase.prototype.init.call(this, service);
    };

    /**
    * Reads the calibration data from the sensor
    * @param {callback} win The success callback
    * @param {callback} fail The failure callback
    */
    SensorTag.BarometricPressure.prototype.readCalibration = function (win, fail) {
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

    SensorTag.BarometricPressure.prototype.enable = function () {
        this.readCalibration(SensorBase.prototype.enable);
    };

    /** 
    * Calculates the pressure
    * @param {Array} data The raw sensor data
    * returns {Number}
    */
    SensorTag.BarometricPressure.prototype.calculatePressure = function (data) {
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



    /**
    * A class representing the Gyroscope sensor
    * @param {SensorTag} sensorTag The SensorTag this sensor belongs to
    */
    SensorTag.Gyroscope = function (sensorTag) {
        var UUID_DATA = "f000aa51-0451-4000-b000-000000000000",
            UUID_CONF = "f000aa52-0451-4000-b000-000000000000",
            UUID_PERIOD = "f000aa53-0451-4000-b000-000000000000";

        SensorTag.SensorBase.prototype.constructor.call(this, sensorTag, UUID_DATA, UUID_CONF, UUID_PERIOD);

        this.Axis = SensorTag.Gyroscope.Axis.XYZ;
        this.identifier = "Gyroscope";
    };

    SensorTag.Gyroscope.UUID_SERVICE = "f000aa50-0451-4000-b000-000000000000";
    SensorTag.Gyroscope.Axis = {
        X: 1,
        Y: 2,
        XY: 3,
        Z: 4,
        XZ: 5,
        YZ: 6,
        XYZ: 7,
    };

    SensorTag.Gyroscope.prototype = new SensorTag.SensorBase();
    SensorTag.Gyroscope.prototype.constructor = SensorTag.Gyroscope;

    SensorTag.Gyroscope.prototype.enable = function () {
        SensorTag.SensorBase.prototype.enable.call(this, this.Axis);
    };

    /**
    * Calculates the offset of the axis in degrees
    * @param {Array} data The raw sensor data
    * @returns {Number}
    */
    SensorTag.Gyroscope.prototype.calculateAxisValue = function (data) {
        var v = new Int16Array(data),
            scaleAxis;

        // Converting from raw data to degrees/second.
        scaleAxis = function (raw) {
            // Calculate rotation, unit deg/s, range -250, +250
            var degrees = raw * (500.0 / 65536.0);

            // Round to 2 decimal places
            return Math.round(degrees * 100) / 100;
        };

        // x, y, z has a wierd order
        return {
            y: scaleAxis(v[0]),
            x: scaleAxis(v[1]),
            z: scaleAxis(v[2]),
        };
    };



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


    // Export the SensorTag class
    window.SensorTag = SensorTag;

})(window);
