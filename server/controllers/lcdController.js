const path = require('path');
const { readJson, writeJson } = require('../utils/fileHandler');

function getLcdFile(req) {
  return path.join(req.app.get('dbDir') || path.join(__dirname, '..', 'db'), 'lcd.json');
}

function sanitizeMessage(message) {
  return String(message || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 32);
}

async function setLcdMessage(req, res) {
  try {
    const message = sanitizeMessage(req.body.message);

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const lcdData = {
      message,
      updatedAt: new Date().toISOString(),
    };

    const lcdFile = getLcdFile(req);
    await writeJson(lcdFile, lcdData);

    const io = req.app.get('io');
    if (io) {
      io.emit('lcd:update', lcdData);
    }

    return res.json({ success: true, message: 'LCD message saved', data: lcdData });
  } catch (error) {
    console.error('LCD POST error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getLcdMessage(req, res) {
  try {
    const lcdFile = getLcdFile(req);
    const lcdData = await readJson(lcdFile, { message: 'HELLO', updatedAt: new Date().toISOString() });
    return res.json({ success: true, data: lcdData });
  } catch (error) {
    console.error('LCD GET error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  setLcdMessage,
  getLcdMessage,
};
