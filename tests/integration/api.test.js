const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const dbFixture = {
  users: '[]',
  sensorData: '[]',
  lcd: JSON.stringify({ message: 'HELLO', updatedAt: new Date().toISOString() }, null, 2),
};

let tempDir;
let app;

async function bootstrapApp() {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'iot-dashboard-'));
  process.env.DB_DIR = tempDir;
  delete process.env.NODE_ENV;

  await fs.writeFile(path.join(tempDir, 'users.json'), dbFixture.users);
  await fs.writeFile(path.join(tempDir, 'sensorData.json'), dbFixture.sensorData);
  await fs.writeFile(path.join(tempDir, 'lcd.json'), dbFixture.lcd);

  const { createApp } = require('../../server/server');
  app = createApp().app;
}

async function cleanupApp() {
  delete process.env.DB_DIR;
  await fs.rm(tempDir, { recursive: true, force: true });
}

test.beforeEach(async () => {
  await bootstrapApp();
});

test.afterEach(async () => {
  await cleanupApp();
});

test('registers a user and creates a session', async () => {
  const agent = request.agent(app);

  const registerResponse = await agent
    .post('/api/auth/register')
    .send({ username: 'rehan', password: 'secret123' })
    .expect(201);

  assert.equal(registerResponse.body.success, true);
  assert.equal(registerResponse.body.user.username, 'rehan');

  const sessionResponse = await agent.get('/api/auth/session').expect(200);
  assert.equal(sessionResponse.body.authenticated, true);
  assert.equal(sessionResponse.body.user.username, 'rehan');
});

test('logs in, protects dashboard routes, and logs out', async () => {
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ username: 'alice', password: 'secret123' }).expect(201);

  const dashboardResponse = await agent.get('/dashboard').set('Accept', 'text/html').expect(200);
  assert.match(dashboardResponse.text, /Temperature, humidity and LCD control/);

  const logoutResponse = await agent.get('/api/auth/logout').expect(200);
  assert.equal(logoutResponse.body.success, true);

  const protectedResponse = await agent.get('/dashboard').set('Accept', 'text/html').expect(302);
  assert.equal(protectedResponse.headers.location, '/login');
});

test('stores sensor data and exposes latest and history endpoints', async () => {
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ username: 'sensor-user', password: 'secret123' }).expect(201);

  const postResponse = await agent
    .post('/api/sensor')
    .send({ temperature: 28.5, humidity: 61 })
    .expect(201);

  assert.equal(postResponse.body.success, true);
  assert.equal(postResponse.body.data.temperature, 28.5);

  const latestResponse = await agent.get('/api/sensor/latest').expect(200);
  assert.equal(latestResponse.body.data.temperature, 28.5);
  assert.equal(latestResponse.body.deviceStatus, 'online');

  const historyResponse = await agent.get('/api/sensor/history').expect(200);
  assert.equal(historyResponse.body.data.length, 1);
  assert.equal(historyResponse.body.data[0].humidity, 61);
});

test('protects LCD write access and keeps LCD polling public', async () => {
  const publicResponse = await request(app).get('/api/lcd').expect(200);
  assert.equal(publicResponse.body.data.message, 'HELLO');

  await request(app).post('/api/lcd').send({ message: 'NOPE' }).expect(401);

  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ username: 'lcd-user', password: 'secret123' }).expect(201);

  const writeResponse = await agent.post('/api/lcd').send({ message: 'WELCOME' }).expect(200);
  assert.equal(writeResponse.body.data.message, 'WELCOME');
});

test('stores alerts when readings exceed thresholds', async () => {
  const agent = request.agent(app);

  await agent.post('/api/auth/register').send({ username: 'alert-user', password: 'secret123' }).expect(201);
  await agent
    .post('/api/alerts/thresholds')
    .send({ temperatureHigh: 30, temperatureLow: 10, humidityHigh: 70, humidityLow: 20 })
    .expect(200);

  await agent.post('/api/sensor').send({ temperature: 32, humidity: 75 }).expect(201);

  const alertsResponse = await agent.get('/api/alerts').expect(200);
  assert.equal(alertsResponse.body.data.length, 1);
  assert.match(alertsResponse.body.data[0].messages[0], /Temperature is above 30°C|Humidity is above 70%/);
});