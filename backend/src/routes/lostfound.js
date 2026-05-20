const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/lostfound');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `lf_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── PUBLIC: Get all approved/reunited reports ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, status, search } = req.query;
    let query = `SELECT * FROM lost_found_reports WHERE 1=1`;
    const params = [];

    if (!status) {
      query += ` AND status IN ('Approved', 'Reunited')`;
    } else {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (type && type !== 'All') {
      query += ` AND type = ?`;
      params.push(type);
    }

    if (search) {
      query += ` AND (pet_name LIKE ? OR pet_description LIKE ? OR reporter_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: Get all reports (any status) ────────────────────────────────────
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = `
      SELECT r.*,
        CONCAT(u.first_name, ' ', u.last_name) AS user_display_name,
        u.profile_photo AS user_photo
      FROM lost_found_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== 'All') {
      query += ` AND r.type = ?`;
      params.push(type);
    }
    if (status && status !== 'All') {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER: Get my own reports ────────────────────────────────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM lost_found_reports WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single report by ID ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM lost_found_reports WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Submit a report ─────────────────────────────────────────────────────────
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const {
      reporter_name, reporter_email, reporter_phone,
      type, pet_name, pet_description, last_seen_location,
      user_id,
    } = req.body;

    const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM lost_found_reports');
    const reportId = `LF${String(countRows[0].cnt + 1).padStart(3, '0')}`;

    const photo = req.file
      ? `/uploads/lostfound/${req.file.filename}`
      : null;

    const [result] = await db.query(
      `INSERT INTO lost_found_reports
        (report_id, user_id, reporter_name, reporter_email, reporter_phone,
         type, pet_name, pet_description, photo, last_seen_location)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        reportId,
        user_id || null,
        reporter_name, reporter_email, reporter_phone,
        type, pet_name || null, pet_description, photo,
        last_seen_location || null,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      report_id: reportId,
      message: 'Report submitted successfully. It will be visible once approved.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: Approve a report ─────────────────────────────────────────────────
router.patch('/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query(
      `UPDATE lost_found_reports SET status = 'Approved', reviewed_by = ?, updated_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Report approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER: Mark own report as Reunited (case resolved) ───────────────────────
router.patch('/:id/reunite', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM lost_found_reports WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Not authorized or report not found.' });
    }
    if (rows[0].status === 'Pending Review') {
      return res.status(400).json({ error: 'Report must be approved before marking as reunited.' });
    }
    await db.query(
      `UPDATE lost_found_reports SET status = 'Reunited', updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Report marked as Reunited 🐾' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USER: Close/cancel own report ───────────────────────────────────────────
router.patch('/:id/close', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM lost_found_reports WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(403).json({ error: 'Not authorized or report not found.' });
    }
    await db.query(
      `UPDATE lost_found_reports SET status = 'Closed', updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Report closed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: Delete a report ───────────────────────────────────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT photo FROM lost_found_reports WHERE id = ?', [req.params.id]);
    if (rows.length && rows[0].photo) {
      const filePath = path.join(__dirname, '../..', rows[0].photo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM lost_found_reports WHERE id = ?', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;