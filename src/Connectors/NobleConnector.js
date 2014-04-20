var Connector = require('./Connector');

var NobleConnector = function (peripheral) {
    Connector.call(this, peripheral);
};

NobleConnector.prototype = new Connector();
NobleConnector.prototype.constructor = NobleConnector;

NobleConnector.prototype.services = function(win, fail) {
    this.peripheral.discoverServices(
        [], 
        function(error, services) {
            if(error) {
                fail(error);
            } else {
                win(services);
            }
        }
    );
};

NobleConnector.prototype.characteristics = function(service, win, fail) {
    service.discoverCharacteristics(
        [], 
        function(error, characteristics) {
            if(error) {
                fail(error);
            } else {
                win(characteristics);
            }
        }
    );
};

NobleConnector.prototype.descriptors = function(characteristic, win, fail) {
    characteristic.discoverDescriptors(function(error, descriptors) {
        if(error) {
            fail(error);
        } else {
            win(descriptors);
        }
    });
};

NobleConnector.prototype.writeCharacteristic = function(characteristic, data, win, fail) {
    var buffer = new Buffer(data);
    
    characteristic.write(buffer, true, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.readCharacteristic = function(characteristic, win, fail) {
    characteristic.read(function(error, data) {
        if(error) {
            fail(error);
        } else {
            win(data);
        }
    });
};

NobleConnector.prototype.writeDescriptor = function(descriptor, data, win, fail) {
    var buffer = new Buffer(data);
    
    descriptor.writeValue(buffer, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.enableNotification = function(characteristic, win, fail) {
    characteristic.on('read', win);
    
    characteristic.notify(true, function(error) {
        if(error) {
            fail(error);
        }
    });
};

NobleConnector.prototype.disableNotification = function(characteristic, win, fail) {
    characteristic.notify(false, function(error) {
        if(error) {
            fail(error);
        } else {
            win();
        }
    });
};

NobleConnector.prototype.close = function() {
    var self = this;
    
    self.peripheral.disconnect();
};

NobleConnector.prototype.toString = function() {
    return this.peripheral.uuid;
};

module.exports = NobleConnector;
