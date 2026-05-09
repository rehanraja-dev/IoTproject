const express = require('express');
const { getDeviceForecast } = require('../controllers/predictionController');

const router = express.Router();

// Public endpoint for ESP8266 and other devices.
router.get('/prediction/latest', getDeviceForecast);

module.exports = router;
