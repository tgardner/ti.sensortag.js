var noble = require('noble');
var SensorTag = require('../src/SensorTag.js');

noble.on('stateChange', function(state) {
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function(peripheral) {
	console.log('peripheral with UUID ' + peripheral.uuid + ' found');
	var advertisement = peripheral.advertisement;

	var localName = advertisement.localName;
	var txPowerLevel = advertisement.txPowerLevel;
	var manufacturerData = advertisement.manufacturerData;
	var serviceData = advertisement.serviceData;
	var serviceUuids = advertisement.serviceUuids;

	if (localName) {
		console.log('  Local Name        = ' + localName);
	}

	if (txPowerLevel) {
		console.log('  TX Power Level    = ' + txPowerLevel);
	}

	if (manufacturerData) {
		console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
	}

	if (serviceData) {
		console.log('  Service Data      = ' + serviceData);
	}

	if (serviceUuids) {
		console.log('  Service UUIDs     = ' + serviceUuids);
	}
	
	if (localName == "SensorTag") {
		noble.stopScanning();

		peripheral.connect(function(error) {
		    if(!error) {
		        var sensor = new SensorTag(new SensorTag.NobleConnector(peripheral));
		        sensor.discover(function() {
		            sensor.Accelerometer.addListener(function(data) {
		                var a = this.calculateAcceleration(data);
		                console.log(a);
		            });
		            
		            sensor.Accelerometer.setPeriod(100);
		            sensor.Accelerometer.enableNotification();
		            sensor.Accelerometer.enable();
		        });
		    } else {
		        console.log(error);
		    }
		});
	}
});
