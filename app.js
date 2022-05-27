/**
 * Report structure:
 * Big-Endian
 * 8 bytes of time, 1 byte of temperature, 2 bytes of humidity, 13 bytes of garbage, 2 bytes of CO2, 6 bytes of header
 */

const usb = require('node-hid');
const mqtt = require('mqtt');

const HUTERMANN_VENDOR_ID = 4292;
const HUTERMANN_PRODUCT_ID = 33485;
const REPORT_ID = 0x05;
const REPORT_LENGTH = 0x3d;
const TEMPERATURE_OFFSET = 8;
const HUMIDITY_OFFSET = 9;
const CARBON_DIOXIDE_OFFSET = 24;

const TEMPERATURE_CELCIUS_OFFSET = 112;

const MQTT_HOST = 'localhost';
const MQTT_PORT = 8883;
const MQTT_USERNAME = 'homeassistant';
const MQTT_PASSWORD = 'secret';
const MQTT_TOPIC = 'hutermann';
const PUBLISH_INTERVAL = 5000;

let device;

const getDevice = () => {
	if (device == null) {
		device = new usb.HID(HUTERMANN_VENDOR_ID, HUTERMANN_PRODUCT_ID);
	}

	return device;
};

const getInfo = () => {
	try {
		const featureReport = getDevice().getFeatureReport(REPORT_ID, REPORT_LENGTH);
		const buffer = Buffer.from(featureReport);

		const temperature = ((buffer.readUInt8(TEMPERATURE_OFFSET) + TEMPERATURE_CELCIUS_OFFSET) / 10).toFixed(1);
		const humidity = (buffer.readUInt16BE(HUMIDITY_OFFSET) / 10).toFixed(1);
		const carbonDioxide = buffer.readUInt16BE(CARBON_DIOXIDE_OFFSET);

		return {temperature, humidity, carbonDioxide};
	} catch (err) {
		device = null;
		return null;
	}
};

const client = mqtt.connect(`mqtt://${MQTT_HOST}`, {
	port: MQTT_PORT,
	username: MQTT_USERNAME,
	password: MQTT_PASSWORD
});

client.on('connect', function () {
	setInterval(() => {
		const info = getInfo();
		if (info == null) {
			return;
		}

		client.publish(MQTT_TOPIC, JSON.stringify(info));
	}, PUBLISH_INTERVAL);
});
