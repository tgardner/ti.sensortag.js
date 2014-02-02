
## TI SensorTag JS

TI SensorTag JS is a wrapper class for the Texas Instruments [CC2541 SensorTag](http://processors.wiki.ti.com/index.php/Bluetooth_SensorTag).
It was built upon the [evothings cordova-ble](https://github.com/evothings/cordova-ble/) Cordova plugin.

The class should implement most of the core functionality described in the [User Guide](http://processors.wiki.ti.com/index.php/SensorTag_User_Guide).

### Installation
1. ```cordova plugin add https://github.com/evothings/cordova-ble.git```
* Build SensorTag.js
* Add ble.js and SensorTag.js to the ```<head>``` section of your index.html file
```<script type="text/javascript" src="ble.js">``` 
```<script type="text/javascript" src="path/to/SensorTag.js">```

### Build
```
npm install
grunt
```

To build documentation, run this command:
```
grunt jsdoc
```
