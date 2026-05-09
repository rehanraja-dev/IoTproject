const express = require('express');
const { trainPredictionModel, getForecast } = require('../controllers/predictionController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/predictions/train
 * Sends historical data to ML API and generates predictions
 * Protected - requires authentication
 */
router.post('/train', requireAuth, trainPredictionModel);

/**
 * GET /api/predictions/forecast
 * Retrieves latest predictions
 * Protected - requires authentication
 */
router.get('/forecast', requireAuth, getForecast);

/**
 * GET /api/predictions/latest
 * Alias for the latest prediction record
 * Protected - requires authentication
 */
router.get('/latest', requireAuth, getForecast);

module.exports = router;
