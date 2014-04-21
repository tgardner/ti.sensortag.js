var Constants = require('./Constants.js');

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

    this.characteristics = {
        config: null,
        period: null,
        data: null,
    };
    
    this.descriptors = {
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
        var characteristic = service.characteristics[ci],
            cGuid = characteristic.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
        
        switch (cGuid) {
            case this.UUID_CONF:
                this.characteristics.config = characteristic;
                break;
            case this.UUID_PERIOD:
                this.characteristics.period = characteristic;
                break;
        }
        
        if(this.UUID_DATA.test(cGuid)) {
            this.characteristics.data = characteristic;

            for (var di in characteristic.descriptors) {
                var descriptor = characteristic.descriptors[di],
                    dGuid = descriptor.uuid.replace(Constants.GUID_PATTERN, Constants.GUID_REPLACEMENT);
                
                if (Constants.GATT_CLIENT_CHAR_CFG_UUID.test(dGuid)) {
                    this.descriptors.notification = descriptor;
                }
            }
        }
    }
    
    this.log("Initialized");
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

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([value || ON]),
        function () {
            self.enabled = true;
            self.log("Enabled");
        },
        function (errorCode) {
            self.log("enable error: " + errorCode);
        }
    );
};

/**
* Disables the sensor
*/
SensorBase.prototype.disable = function () {
    var OFF = 0,
        self = this;

    self.sensorTag.device.writeCharacteristic(
        self.characteristics.config,
        new Uint8Array([OFF]),
        function () {
            self.enabled = true;
            self.log("Disabled");
        },
        function (errorCode) {
            self.log("disable error: " + errorCode);
        }
    );
};

/**
* Enables notifications for the sensor
*/
SensorBase.prototype.enableNotification = function () {
    var ENABLE_NOTIFICATIONS = [1, 0],
        self = this;
    
    self.sensorTag.device.writeDescriptor(
        self.descriptors.notification,
        new Uint8Array(ENABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications enabled");
        },
        function (errorCode) {
            self.log("enableNotifications write error: " + errorCode);
        }
    );
    
    self.sensorTag.device.enableNotification(
        self.characteristics.data,
        function() {
            self.onDataNotify.apply(self, arguments);
        },
        function (errorCode) {
            self.log("enableNotifications subscribe error: " + errorCode);
        }
    );
};

/**
* Disables notifications for the sensor
*/
SensorBase.prototype.disableNotification = function () {
    var DISABLE_NOTIFICATIONS = [0, 0],
        self = this;

    self.sensorTag.device.writeDescriptor(
        self.descriptors.notification,
        new Uint8Array(DISABLE_NOTIFICATIONS),
        function () {
            self.log("Notifications disabled");
        },
        function (errorCode) {
            self.log("disableNotification write error: " + errorCode);
        }
    );
    
    self.sensorTag.device.disableNotification(
        self.characteristics.data,
        function() {
            // Do nothing
        },
        function (errorCode) {
            self.log("disableNotification subscribe error: " + errorCode);
        }
    );
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
