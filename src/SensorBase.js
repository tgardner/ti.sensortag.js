
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
