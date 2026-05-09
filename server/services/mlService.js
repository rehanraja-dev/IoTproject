const axios = require('axios');
const path = require('path');
const { readJson, writeJson } = require('../utils/fileHandler');

/**
 * ML Service - Sends sensor data to external ML API for predictions
 * Configure ML_API_URL in .env with your Colab/ML endpoint
 */

async function getHistoricalData(dbDir) {
  try {
    const sensorFile = path.join(dbDir, 'sensorData.json');
    const sensorData = await readJson(sensorFile, []);
    
    if (!sensorData.length) {
      throw new Error('No historical sensor data available');
    }

    return {
      timestamps: sensorData.map(d => d.time),
      temperatures: sensorData.map(d => d.temperature),
      humidity: sensorData.map(d => d.humidity),
      dataPoints: sensorData.length,
    };
  } catch (error) {
    throw new Error(`Failed to retrieve historical data: ${error.message}`);
  }
}

async function sendToPredictionAPI(historicalData, mlApiUrl, mlApiKey) {
  if (!mlApiUrl) {
    throw new Error('ML_API_URL not configured. Set it in your .env file.');
  }

  try {
    const payload = {
      temperatures: historicalData.temperatures,
      humidity: historicalData.humidity,
      timestamps: historicalData.timestamps,
      dataPoints: historicalData.dataPoints,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    // Add authorization if API key is provided
    if (mlApiKey) {
      config.headers['Authorization'] = `Bearer ${mlApiKey}`;
    }

    console.log(`Sending ${historicalData.dataPoints} data points to ML API: ${mlApiUrl}`);

    const response = await axios.post(mlApiUrl, payload, config);

    return {
      success: true,
      predictions: response.data.predictions || response.data,
      rawResponse: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('ML API call failed:', error.message);
    throw new Error(`ML API error: ${error.message}`);
  }
}

async function savePredictions(dbDir, predictionData) {
  try {
    const predictionsFile = path.join(dbDir, 'predictions.json');
    
    const predictionRecord = {
      timestamp: new Date().toISOString(),
      dataUsed: predictionData.dataPoints,
      predictions: predictionData.predictions || predictionData.rawResponse,
      status: 'success',
    };

    // Keep last 10 predictions for history
    const existing = await readJson(predictionsFile, []);
    const updated = [predictionRecord, ...existing].slice(0, 10);

    await writeJson(predictionsFile, updated);

    return predictionRecord;
  } catch (error) {
    throw new Error(`Failed to save predictions: ${error.message}`);
  }
}

async function getPredictions(dbDir) {
  try {
    const predictionsFile = path.join(dbDir, 'predictions.json');
    const predictions = await readJson(predictionsFile, []);
    return predictions[0] || null;
  } catch (error) {
    console.error('Error reading predictions:', error);
    return null;
  }
}

module.exports = {
  getHistoricalData,
  sendToPredictionAPI,
  savePredictions,
  getPredictions,
};
