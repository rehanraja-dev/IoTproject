const path = require('path');
const bcrypt = require('bcrypt');
const { readJson, writeJson } = require('../utils/fileHandler');

const saltRounds = 10;

function getUsersFile(req) {
  return path.join(req.app.get('dbDir') || path.join(__dirname, '..', 'db'), 'users.json');
}

function sanitizeUsername(username) {
  return String(username || '').trim();
}

function sanitizePassword(password) {
  return String(password || '').trim();
}

async function register(req, res) {
  try {
    const username = sanitizeUsername(req.body.username);
    const password = sanitizePassword(req.body.password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const usersFile = getUsersFile(req);
    const users = await readJson(usersFile, []);
    const existingUser = users.find((user) => user.username.toLowerCase() === username.toLowerCase());

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = {
      id: Date.now(),
      username,
      password: hashedPassword,
    };

    users.push(newUser);
    await writeJson(usersFile, users);

    req.session.user = {
      id: newUser.id,
      username: newUser.username,
    };

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: req.session.user,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const username = sanitizeUsername(req.body.username);
    const password = sanitizePassword(req.body.password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const usersFile = getUsersFile(req);
    const users = await readJson(usersFile, []);
    const user = users.find((item) => item.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user: req.session.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ success: false, message: 'Could not log out' });
    }

    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully' });
  });
}

function sessionStatus(req, res) {
  return res.json({
    authenticated: Boolean(req.session?.user),
    user: req.session?.user || null,
  });
}

module.exports = {
  register,
  login,
  logout,
  sessionStatus,
};
