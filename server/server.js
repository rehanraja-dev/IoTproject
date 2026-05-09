const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs/promises');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const lcdRoutes = require('./routes/lcdRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const { attachUser, requireAuth } = require('./middleware/authMiddleware');
const { ensureFile } = require('./utils/fileHandler');

function createApp() {
  const app = express();
  const publicDir = path.join(__dirname, '..', 'public');
  const dbDir = process.env.DB_DIR || path.join(__dirname, 'db');
  const isProduction = process.env.NODE_ENV === 'production';
  app.set('dbDir', dbDir);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'iot-dashboard-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
      },
    })
  );
  app.use(attachUser);
  app.use(express.static(publicDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/sensor', sensorRoutes);
  app.use('/api/lcd', lcdRoutes);
  app.use('/api/predictions', predictionRoutes);

  app.get('/', (req, res) => {
    if (req.session?.user) {
      return res.redirect('/dashboard');
    }
    return res.redirect('/login');
  });

  app.get('/login', (req, res) => {
    res.sendFile(path.join(publicDir, 'login.html'));
  });

  app.get('/register', (req, res) => {
    res.sendFile(path.join(publicDir, 'register.html'));
  });

  app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(publicDir, 'dashboard.html'));
  });

  app.get('/health', (req, res) => {
    res.json({ success: true, message: 'IoT dashboard is running' });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

  async function initializeDatabase() {
    await fs.mkdir(dbDir, { recursive: true });
    await ensureFile(path.join(dbDir, 'users.json'), []);
    await ensureFile(path.join(dbDir, 'sensorData.json'), []);
    await ensureFile(path.join(dbDir, 'lcd.json'), {
      message: 'HELLO',
      updatedAt: new Date().toISOString(),
    });
    await ensureFile(path.join(dbDir, 'thresholds.json'), {
      temperatureHigh: 35,
      temperatureLow: 15,
      humidityHigh: 80,
      humidityLow: 30,
    });
    await ensureFile(path.join(dbDir, 'alerts.json'), []);
    await ensureFile(path.join(dbDir, 'predictions.json'), []);
  }

  return {
    app,
    initializeDatabase,
    isProduction,
  };
}

const envPort = Number(process.env.PORT);
const PORT = Number.isFinite(envPort) ? envPort : 3000;

async function startServer() {
  const { app, initializeDatabase, isProduction } = createApp();

  function listenOnPort(port, attempt = 0) {
    return new Promise((resolve, reject) => {
      const httpServer = createServer(app);
      const io = new Server(httpServer, {
        cors: {
          origin: true,
          methods: ['GET', 'POST'],
        },
      });

      app.set('io', io);

      io.on('connection', (socket) => {
        socket.emit('connected', { message: 'Dashboard connected to live updates' });
      });

      const server = httpServer.listen(port, () => {
        const actualPort = server.address().port;
        console.log(`Server running on port ${actualPort}`);
        resolve(server);
      });

      server.on('error', (error) => {
        if (!isProduction && error.code === 'EADDRINUSE' && attempt < 10) {
          const nextPort = port === 0 ? 0 : port + 1;
          console.warn(`Port ${port} is busy, trying ${nextPort}...`);
          io.close();
          server.close(() => {});
          resolve(listenOnPort(nextPort, attempt + 1));
          return;
        }

        io.close();
        server.close(() => {});
        reject(error);
      });
    });
  }

  try {
    await initializeDatabase();
    return await listenOnPort(PORT);
  } catch (error) {
    console.error('Failed to initialize database or start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
