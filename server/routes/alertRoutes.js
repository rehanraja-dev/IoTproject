const express = require('express');
const { getAlerts, getThresholds, updateThresholds } = require('../controllers/alertController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/thresholds', requireAuth, getThresholds);
router.post('/thresholds', requireAuth, updateThresholds);
router.get('/', requireAuth, getAlerts);

module.exports = router;
