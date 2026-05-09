const path = require('path');
const { getHistoricalData, sendToPredictionAPI, savePredictions, getPredictions } = require('../services/mlService');

function getPredictionsDir(req) {
  return req.app.get('dbDir') || path.join(__dirname, '..', 'db');
}

async function trainPredictionModel(req, res) {
  try {
    const dbDir = getPredictionsDir(req);
    const mlApiUrl = process.env.ML_API_URL;
    const mlApiKey = process.env.ML_API_KEY;

    // Get historical data
    const historicalData = await getHistoricalData(dbDir);

    if (historicalData.dataPoints < 2) {
      return res.status(400).json({
        success: false,
        message: 'Not enough historical data (minimum 2 data points required)',
      });
    }

    // Send to ML API
    const predictionResult = await sendToPredictionAPI(historicalData, mlApiUrl, mlApiKey);

    // Save predictions
    const saved = await savePredictions(dbDir, {
      dataPoints: historicalData.dataPoints,
      ...predictionResult,
    });

    return res.json({
      success: true,
      message: 'Predictions generated successfully',
      data: saved,
    });
  } catch (error) {
    console.error('Prediction training error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate predictions',
    });
  }
}

async function getForecast(req, res) {
  try {
    const dbDir = getPredictionsDir(req);
    const predictions = await getPredictions(dbDir);

    if (!predictions) {
      return res.json({
        success: true,
        data: null,
        message: 'No predictions available. Run training first.',
      });
    }

    return res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    console.error('Get forecast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve predictions',
    });
  }
}

module.exports = {
  trainPredictionModel,
  getForecast,
};
