const express = require('express');
const { login, logout, register, sessionStatus } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/session', sessionStatus);
router.get('/me', requireAuth, sessionStatus);

module.exports = router;
