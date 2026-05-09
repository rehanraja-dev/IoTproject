const express = require('express');
const {
  postSensorData,
  getLatestSensorData,
  getSensorHistory,
} = require('../controllers/sensorController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', postSensorData);
router.get('/latest', getLatestSensorData);
router.get('/history', requireAuth, getSensorHistory);

module.exports = router;
