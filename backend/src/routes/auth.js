const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, address, city, province } = req.body;
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, phone, address, city, province) VALUES (?,?,?,?,?,?,?,?)',
      [first_name, last_name, email, hash, phone, address, city, province]
    );
    const token = jwt.sign(
      { id: result.insertId, email, role: 'user', first_name, last_name },
      process.env.JWT_SECRET || 'petlink_secret',
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: result.insertId, first_name, last_name, email, role: 'user' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
      process.env.JWT_SECRET || 'petlink_secret',
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, profile_photo: user.profile_photo } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT id, first_name, last_name, email, phone, address, city, province, role, profile_photo, created_at FROM users WHERE id = ?', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
