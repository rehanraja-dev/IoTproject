const express = require('express');
const { setLcdMessage, getLcdMessage } = require('../controllers/lcdController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, setLcdMessage);
router.get('/', getLcdMessage);

module.exports = router;
