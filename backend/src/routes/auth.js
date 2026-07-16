const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Photo upload storage for user profile pictures
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => cb(null, `avatar_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

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
    res.status(201).json({ token, user: { id: result.insertId, first_name, last_name, email, role: 'user', profile_photo: null } });
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

// Update own profile (name, email, phone, address, city, province)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, city, province } = req.body;

    // Make sure the new email isn't taken by someone else
    if (email) {
      const [taken] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
      if (taken.length > 0) return res.status(409).json({ error: 'Email already in use' });
    }

    const nullify = (v) => (v === '' || v === undefined) ? null : v;
    await db.query(
      `UPDATE users SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, province=? WHERE id=?`,
      [first_name, last_name, email, nullify(phone), nullify(address), nullify(city), nullify(province), req.user.id]
    );

    const [rows] = await db.query(
      'SELECT id, first_name, last_name, email, phone, address, city, province, role, profile_photo, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload / change own profile photo
router.put('/profile/photo', authMiddleware, uploadAvatar.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    await db.query('UPDATE users SET profile_photo = ? WHERE id = ?', [photoUrl, req.user.id]);
    res.json({ profile_photo: photoUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: read-only view of any user's profile (for vetting adopters). Never returns password_hash.
router.get('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, email, phone, address, city, province, role, profile_photo, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN/STAFF: create a system account (staff, admin, foster, lost_found_manager) ───
router.post('/admin/create-account', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, role } = req.body;
    const allowedRoles = ['staff', 'admin', 'foster', 'lost_found_manager'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, phone, role) VALUES (?,?,?,?,?,?)',
      [first_name, last_name, email, hash, phone || null, role]
    );
    res.status(201).json({ id: result.insertId, message: `${role} account created` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN/STAFF: list all staff-type accounts (for a management table) ───
router.get('/admin/accounts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, created_at
       FROM users
       WHERE role IN ('staff','admin','foster','lost_found_manager')
       ORDER BY role ASC, created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN/STAFF: list just the fosters (for the "Fostered By" dropdown) ───
router.get('/admin/fosters', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email FROM users WHERE role = 'foster' ORDER BY first_name ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN/STAFF: delete a system account ───
router.delete('/admin/accounts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Don't let someone delete their own logged-in account by accident
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You can't delete your own account while logged in." });
    }
    await db.query('DELETE FROM users WHERE id = ? AND role IN (?,?,?,?)',
      [req.params.id, 'staff', 'admin', 'foster', 'lost_found_manager']);
    res.json({ message: 'Account deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
