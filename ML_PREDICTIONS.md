# ML Predictions Guide

This guide explains how to set up your own ML prediction endpoint and integrate it with the IoT Dashboard.

## Overview

The dashboard collects temperature and humidity data from your ESP8266 sensor and can send it to an external ML API to generate predictions about future values.

### Architecture

```
IoT Dashboard
    ↓
/api/predictions/train (sends historical data)
    ↓
Your ML API (Google Colab, HuggingFace, custom server, etc.)
    ↓
Predictions stored and displayed on dashboard
```

## Setup Steps

### 1. Create Your ML API Endpoint

You need an endpoint that:
- **Accepts POST requests** with sensor data
- **Returns predictions** in a JSON format

#### Example: Google Colab (Recommended for beginners)

Create a new Colab notebook and use **ngrok** to expose it:

```python
# In Google Colab
!pip install ngrok-py Flask
from flask import Flask, request, jsonify
from ngrok import connect

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    temperatures = data.get('temperatures', [])
    humidity = data.get('humidity', [])
    
    # Your ML model here (simple example: moving average)
    avg_temp = sum(temperatures) / len(temperatures) if temperatures else 0
    avg_humidity = sum(humidity) / len(humidity) if humidity else 0
    
    return jsonify({
        'predicted_temperatures': [avg_temp + 1, avg_temp + 2, avg_temp + 3],
        'predicted_humidity': [avg_humidity + 2, avg_humidity + 2.5, avg_humidity + 3],
        'confidence': 0.85
    })

# Expose with ngrok
public_url = connect(5000).public_url
print(f"API available at: {public_url}/predict")

app.run(port=5000)
```

#### Example: Local Flask Server

```python
# local_ml_api.py
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    temps = data['temperatures']
    humidity = data['humidity']
    
    # Simple linear regression prediction
    predicted_temps = [t + 0.5 for t in temps[-3:]]  # Last 3 + small increase
    predicted_humidity = [h + 1 for h in humidity[-3:]]
    
    return jsonify({
        'predicted_temperatures': predicted_temps,
        'predicted_humidity': predicted_humidity,
        'model': 'linear_regression',
        'accuracy': 0.78
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```env
PORT=3000
SESSION_SECRET=your-secret-here
BACKEND_URL=https://iotproject-55dt.onrender.com
ML_API_URL=https://your-colab-ngrok-url.ngrok.io/predict
ML_API_KEY=your_api_key_if_needed
```

**For Render deployment:**
1. Go to your Render dashboard
2. Go to Environment tab
3. Add:
   - `ML_API_URL` = your endpoint URL
   - `ML_API_KEY` = your API key (if needed)

### 3. API Request Format

When you click "Generate Predictions" on the dashboard, it sends:

```json
POST /api/predictions/train
{
  "temperatures": [22.5, 23.0, 23.5, 24.0],
  "humidity": [55, 56, 57, 58],
  "timestamps": ["2026-05-09T10:00:00Z", "2026-05-09T10:05:00Z", ...],
  "dataPoints": 4
}
```

Your API should return:

```json
{
  "predicted_temperatures": [24.5, 25.0, 25.5],
  "predicted_humidity": [59, 60, 61],
  "confidence": 0.85,
  "model_type": "your_model_name"
}
```

### 4. Dashboard Usage

1. **Fill your dashboard with sensor data**
   - Let ESP8266 send readings for at least 2-3 hours
   - Check "Device Status" shows "online"

2. **Click "Generate Predictions"**
   - Dashboard sends all historical data to your ML API
   - Predictions appear below the button

3. **View predictions**
   - Shows latest predictions with timestamp
   - Displays data points used in training

## Popular ML Services

### Option 1: Google Colab (Free, Recommended)
- **Pros**: Free, easy to use, Python ecosystem, ngrok integration
- **Cons**: Requires keeping browser tab open
- **Setup**: See example above
- **Cost**: Free

### Option 2: Hugging Face Inference API
- **Pros**: Always running, scalable, many pre-trained models
- **Cons**: Need API key, limited free tier
- **Setup**: Create account, use their model endpoint
- **Cost**: Free tier available

```python
# Using Hugging Face
HF_API_URL = "https://api-inference.huggingface.co/models/your-model-id"
HF_API_KEY = "hf_your_key"

headers = {"Authorization": f"Bearer {HF_API_KEY}"}
response = requests.post(HF_API_URL, headers=headers, json=payload)
```

### Option 3: AWS SageMaker / Azure ML
- **Pros**: Production-grade, scalable, powerful
- **Cons**: More complex, paid service
- **Setup**: Follow their documentation
- **Cost**: Pay per usage

### Option 4: Local Node.js Model (No External API)
- **Pros**: Fast, free, fully local
- **Cons**: Limited ML capabilities
- **Setup**: Use `simple-statistics` or `ml.js` npm packages

```javascript
// simple-statistics example
const stats = require('simple-statistics');
const temps = data.temperatures;
const regression = stats.linearRegression(temps.map((t, i) => [i, t]));
const predicted = [temps.length, temps.length + 1, temps.length + 2]
  .map(i => regression.m * i + regression.b);
```

## Troubleshooting

### "ML_API_URL not configured"
- Add `ML_API_URL` to `.env` file
- Restart the application
- On Render, add it to Environment variables

### "ML API error: Connection timeout"
- Your ML endpoint is not responding
- Check if Google Colab/Flask server is running
- Verify the URL is correct and public
- Check firewall/CORS settings

### "No historical data available"
- Need at least 2 sensor readings
- Let ESP8266 run for a few minutes
- Check that sensor readings are appearing on dashboard

### "Predictions not displaying"
- Check browser console for errors (F12 → Console)
- Verify ML API returns valid JSON
- Check that prediction response includes expected fields

## API Response Field Mapping

Your ML API can return predictions in any format. The dashboard looks for:

```javascript
// Preferred format
{
  "predicted_temperatures": [24.5, 25.0, 25.5],
  "predicted_humidity": [59, 60, 61]
}

// Or any nested structure - it will be displayed as JSON
{
  "forecast": {
    "next_3_hours": { "temp": 25, "humidity": 60 },
    "next_6_hours": { "temp": 26, "humidity": 58 }
  }
}
```

## Local Testing

Test your endpoint before deploying:

```bash
# Test with curl
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "temperatures": [22, 23, 24],
    "humidity": [50, 55, 60],
    "dataPoints": 3
  }'
```

## Security Notes

- **Never commit `.env` file** with real API keys
- Use **HTTPS only** for production URLs
- Implement **rate limiting** on your ML API
- Validate **data size** (limit to last 1000 readings)
- Use **API keys** for public endpoints

## Next Steps

1. Set up your ML API endpoint
2. Add `ML_API_URL` to `.env`
3. Test locally with `npm run dev`
4. Deploy to Render
5. Add `ML_API_URL` to Render Environment
6. Generate some predictions!
