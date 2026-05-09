const path = require('path');
const { readJson, writeJson } = require('../utils/fileHandler');

function getThresholdFile(req) {
  return path.join(req.app.get('dbDir') || path.join(__dirname, '..', 'db'), 'thresholds.json');
}

function getAlertsFile(req) {
  return path.join(req.app.get('dbDir') || path.join(__dirname, '..', 'db'), 'alerts.json');
}

function defaultThresholds() {
  return {
    temperatureHigh: 35,
    temperatureLow: 15,
    humidityHigh: 80,
    humidityLow: 30,
  };
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeThresholdInput(payload) {
  return {
    temperatureHigh: toNullableNumber(payload.temperatureHigh),
    temperatureLow: toNullableNumber(payload.temperatureLow),
    humidityHigh: toNullableNumber(payload.humidityHigh),
    humidityLow: toNullableNumber(payload.humidityLow),
  };
}

function collectAlerts(reading, thresholds) {
  const messages = [];

  if (thresholds.temperatureHigh !== null && reading.temperature > thresholds.temperatureHigh) {
    messages.push(`Temperature is above ${thresholds.temperatureHigh}°C`);
  }

  if (thresholds.temperatureLow !== null && reading.temperature < thresholds.temperatureLow) {
    messages.push(`Temperature is below ${thresholds.temperatureLow}°C`);
  }

  if (thresholds.humidityHigh !== null && reading.humidity > thresholds.humidityHigh) {
    messages.push(`Humidity is above ${thresholds.humidityHigh}%`);
  }

  if (thresholds.humidityLow !== null && reading.humidity < thresholds.humidityLow) {
    messages.push(`Humidity is below ${thresholds.humidityLow}%`);
  }

  return messages;
}

async function getThresholds(req, res) {
  try {
    const thresholdFile = getThresholdFile(req);
    const thresholds = await readJson(thresholdFile, defaultThresholds());

    return res.json({ success: true, data: thresholds });
  } catch (error) {
    console.error('Threshold GET error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function updateThresholds(req, res) {
  try {
    const thresholdFile = getThresholdFile(req);
    const existingThresholds = await readJson(thresholdFile, defaultThresholds());
    const mergedThresholds = {
      ...existingThresholds,
      ...normalizeThresholdInput(req.body),
    };

    await writeJson(thresholdFile, mergedThresholds);

    return res.json({ success: true, message: 'Thresholds updated', data: mergedThresholds });
  } catch (error) {
    console.error('Threshold POST error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getAlerts(req, res) {
  try {
    const alertsFile = getAlertsFile(req);
    const alerts = await readJson(alertsFile, []);

    return res.json({ success: true, data: alerts.slice().reverse() });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function evaluateThresholds(req, reading) {
  const thresholdFile = getThresholdFile(req);
  const alertsFile = getAlertsFile(req);
  const thresholds = await readJson(thresholdFile, defaultThresholds());
  const messages = collectAlerts(reading, thresholds);

  if (!messages.length) {
    return null;
  }

  const alertRecord = {
    id: Date.now(),
    temperature: reading.temperature,
    humidity: reading.humidity,
    messages,
    time: reading.time,
  };

  const alerts = await readJson(alertsFile, []);
  alerts.push(alertRecord);
  await writeJson(alertsFile, alerts);

  return alertRecord;
}

module.exports = {
  getThresholds,
  updateThresholds,
  getAlerts,
  evaluateThresholds,
  defaultThresholds,
};