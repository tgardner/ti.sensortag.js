var Connector = require('./Connector');

var EvothingsConnector = function (peripheral, ble) {
    Connector.call(this, peripheral);
    
    this.ble = ble;
};

EvothingsConnector.prototype = new Connector();
EvothingsConnector.prototype.constructor = EvothingsConnector;

EvothingsConnector.prototype.services = function(win, fail) {
    this.ble.services(
        this.peripheral,
        win,
        fail
    );
};

EvothingsConnector.prototype.characteristics = function(service, win, fail) {
    this.ble.characteristics(
        this.peripheral,
        service.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.descriptors = function(characteristic, win, fail) {
    this.ble.descriptors(
        this.peripheral,
        characteristic.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.writeCharacteristic = function(characteristic, data, win, fail) {
    this.ble.writeCharacteristic(
        this.peripheral,
        characteristic.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.readCharacteristic = function(characteristic, win, fail) {
    this.ble.readCharacteristic(
        this.peripheral,
        characteristic.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.writeDescriptor = function(descriptor, data, win, fail) {
    this.ble.writeDescriptor(
        this.peripheral,
        descriptor.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.enableNotification = function(characteristic, win, fail) {
    this.ble.enableNotification(
        this.peripheral,
        characteristic.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.disableNotification = function(characteristic, win, fail) {
    this.ble.disableNotification(
        this.peripheral,
        characteristic.handle,
        win,
        fail
    );
};

EvothingsConnector.prototype.close = function() {
    this.ble.close(this.peripheral);
};

EvothingsConnector.prototype.toString = function() {
    return this.peripheral;
};

module.exports = EvothingsConnector;
