const path = require('path');
const { readJson, writeJson } = require('../utils/fileHandler');
const { evaluateThresholds } = require('./alertController');

const latestWindowMs = 15000;

function getSensorFile(req) {
  return path.join(req.app.get('dbDir') || path.join(__dirname, '..', 'db'), 'sensorData.json');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function postSensorData(req, res) {
  try {
    const temperature = toNumber(req.body.temperature);
    const humidity = toNumber(req.body.humidity);

    if (temperature === null || humidity === null) {
      return res.status(400).json({ success: false, message: 'Temperature and humidity must be numbers' });
    }

    const sensorFile = getSensorFile(req);
    const sensorData = await readJson(sensorFile, []);
    const reading = {
      temperature,
      humidity,
      time: new Date().toISOString(),
    };

    sensorData.push(reading);
    await writeJson(sensorFile, sensorData);

    const io = req.app.get('io');
    if (io) {
      io.emit('sensor:update', reading);
    }

    const alertRecord = await evaluateThresholds(req, reading);
    if (alertRecord && io) {
      io.emit('alert:update', alertRecord);
    }

    return res.status(201).json({ success: true, message: 'Sensor data saved', data: reading });
  } catch (error) {
    console.error('Sensor POST error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getLatestSensorData(req, res) {
  try {
    const sensorFile = getSensorFile(req);
    const sensorData = await readJson(sensorFile, []);
    const latestReading = sensorData[sensorData.length - 1] || null;

    if (!latestReading) {
      return res.json({
        success: true,
        data: null,
        deviceStatus: 'offline',
        lastUpdated: null,
      });
    }

    const lastUpdatedAt = new Date(latestReading.time).getTime();
    const isOnline = Date.now() - lastUpdatedAt <= latestWindowMs;

    return res.json({
      success: true,
      data: latestReading,
      deviceStatus: isOnline ? 'online' : 'offline',
      lastUpdated: latestReading.time,
    });
  } catch (error) {
    console.error('Latest sensor error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getSensorHistory(req, res) {
  try {
    const sensorFile = getSensorFile(req);
    const sensorData = await readJson(sensorFile, []);
    return res.json({ success: true, data: sensorData.slice().reverse() });
  } catch (error) {
    console.error('Sensor history error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  postSensorData,
  getLatestSensorData,
  getSensorHistory,
};
