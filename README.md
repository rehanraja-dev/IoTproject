# IoT Temperature and Humidity Dashboard

A beginner-friendly IoT web application for monitoring temperature and humidity from an ESP8266 + DHT11 sensor, viewing readings in a web dashboard, and sending messages to a 16x2 I2C LCD remotely.

## Tech Stack

- Frontend: HTML, Tailwind CSS, Vanilla JavaScript
- Backend: Node.js, Express.js
- Authentication: express-session, bcrypt
- Database: JSON files only
- Hardware: ESP8266 NodeMCU, DHT11, 16x2 I2C LCD
- Deployment: Render

## Project Structure

```text
iot-dashboard/
├── server/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── db/
│   └── utils/
├── public/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── js/
│   └── css/
├── esp8266/
├── package.json
└── README.md
```

## Features

- Register, login, and logout with session-based authentication
- Protected dashboard, LCD control, and sensor history
- Live sensor polling with automatic refresh
- Realtime dashboard updates using Socket.IO
- Server-side safety thresholds and alerts
- JSON file storage for users, sensor readings, and LCD messages
- ESP8266 firmware that posts readings and fetches LCD text
- Render-ready single Express server

## Local Setup

1. Install Node.js 18+.
2. Open the project folder.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Run the automated tests:

```bash
npm test
```

6. Open the app in your browser:

```text
http://localhost:3000
```

## Environment Variables

The app works without extra configuration, but these variables are recommended on Render:

- `PORT` - set automatically by Render
- `SESSION_SECRET` - a long random string for session security

Example local `.env` values:

```text
PORT=3000
SESSION_SECRET=your-long-random-secret
```

## API Routes

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/logout`
- `GET /api/auth/session`

Example register payload:

```json
{
  "username": "rehan",
  "password": "secret123"
}
```

### Sensor Data

- `POST /api/sensor` - ESP8266 uploads readings
- `GET /api/sensor/latest` - latest temperature and humidity
- `GET /api/sensor/history` - protected history table

Example sensor payload:

```json
{
  "temperature": 28.5,
  "humidity": 60
}
```

### LCD Control

- `POST /api/lcd` - protected dashboard action
- `GET /api/lcd` - public poll endpoint for ESP8266

Example LCD payload:

```json
{
  "message": "HELLO"
}
```

## JSON Database Files

- `server/db/users.json`
- `server/db/sensorData.json`
- `server/db/lcd.json`

Example records:

```json
[
  {
    "id": 1,
    "username": "rehan",
    "password": "hashed_password"
  }
]
```

```json
[
  {
    "temperature": 28,
    "humidity": 60,
    "time": "2026-05-09T11:00:00Z"
  }
]
```

```json
{
  "message": "HELLO",
  "updatedAt": "2026-05-09T11:00:00Z"
}
```

## Hardware Wiring

### DHT11 to ESP8266

- VCC -> 3V3
- GND -> GND
- DATA -> D4 (GPIO2)

### I2C LCD to ESP8266

- VCC -> VIN
- GND -> GND
- SDA -> D2 (GPIO4)
- SCL -> D1 (GPIO5)

## ESP8266 Firmware Setup

1. Install Arduino IDE.
2. Install these libraries:
   - ESP8266WiFi
   - ESP8266HTTPClient
   - DHT sensor library
   - LiquidCrystal_I2C
3. Open `esp8266/esp8266_iot_dashboard.ino`.
4. Update:
   - WiFi name and password
   - Render backend URL
   - LCD I2C address if needed
5. Upload the sketch to the ESP8266.

### Firmware Behavior

- Reads the DHT11 every 5 seconds
- Sends temperature and humidity to `POST /api/sensor`
- Polls `GET /api/lcd` every 2 seconds
- Displays the LCD message on the 16x2 display

## Realtime Dashboard Updates

The dashboard also subscribes to live Socket.IO events from the server.

- When a new sensor reading is saved, the temperature, humidity, and history table update immediately.
- When the LCD message changes, the dashboard shows the new message right away.
- Polling still remains in place as a fallback, so the app continues to work even if realtime transport is unavailable.

## Threshold Alerts

The dashboard includes simple safety thresholds for temperature and humidity.

- Users can save high and low limits from the dashboard.
- Incoming sensor readings are checked on the server.
- If a reading falls outside the saved range, an alert is recorded and pushed to the dashboard in realtime.

## Automated Tests

The project includes a small integration test suite that checks:

- user registration and session creation
- login, dashboard protection, and logout
- sensor data storage and history retrieval
- LCD write protection and public LCD polling

## Render Deployment Guide

1. Push the project to GitHub.
2. Use the included [`render.yaml`](render.yaml) blueprint or create a new **Web Service** manually.
3. Keep the build command as `npm install` and the start command as `npm start`.
4. Make sure `SESSION_SECRET` exists in Render. The blueprint generates it automatically.
5. Leave `PORT` unset in Render so the platform can assign it automatically.
6. Deploy the service.
7. Copy the Render URL into the ESP8266 firmware as `BACKEND_URL`.

The app is already Render-ready because it uses a single Express server, serves the static frontend, and reads `process.env.PORT` at startup.

## Beginner Workflow

1. Register a new account.
2. Log in.
3. Open the dashboard.
4. Wait for the ESP8266 to send sensor readings.
5. Type a short LCD message and send it.
6. Watch the LCD update on the device.

## Notes

- The dashboard refreshes sensor data automatically every few seconds.
- Sensor readings are appended to the JSON file history.
- The LCD message is limited to 32 characters for a 16x2 screen.
- For production use, always set a strong `SESSION_SECRET`.
