
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
    SIMPLEKEY_UUID_DATA: "0000ffe1-0000-1000-8000-00805f9b34fb",
    
    GUID_PATTERN: /([a-f0-9]{8})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{4})-?([a-f0-9]{12})/g,
    GUID_REPLACEMENT: '$1-$2-$3-$4-$5'
};
