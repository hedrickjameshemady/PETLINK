const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();


router.get('/campaigns', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = rows.map(c => {
      if (c.status === 'Cancelled' || c.status === 'Completed') return c;

      const start = c.start_date ? new Date(c.start_date) : null;
      const end = c.end_date ? new Date(c.end_date) : null;

      if (end && today > end) return { ...c, status: 'Completed' };
      if (start && today >= start) return { ...c, status: 'Active' };
      return { ...c, status: 'Upcoming' };
    });

    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create campaign (admin)
router.post('/campaigns', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, type, description, target_amount, start_date, end_date, location } = req.body;
    const [result] = await db.query(
      'INSERT INTO campaigns (title, type, description, target_amount, start_date, end_date, location, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [title, type, description, target_amount, start_date, end_date, location, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Campaign created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update campaign
router.put('/campaigns/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, type, description, target_amount, start_date, end_date, location, status } = req.body;
    await db.query(
      'UPDATE campaigns SET title=?, type=?, description=?, target_amount=?, start_date=?, end_date=?, location=?, status=? WHERE id=?',
      [title, type, description, target_amount, start_date, end_date, location, status, req.params.id]
    );
    res.json({ message: 'Campaign updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// User joins/RSVPs a campaign
router.post('/campaigns/:id/join', authMiddleware, async (req, res) => {
  try {
    const [existing] = await db.query(
      'SELECT id FROM campaign_participants WHERE campaign_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You have already joined this campaign.' });
    }
    await db.query(
      'INSERT INTO campaign_participants (campaign_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );
    res.status(201).json({ message: 'Successfully joined!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete campaign
router.delete('/campaigns/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
    res.json({ message: 'Campaign deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update feedback status
router.patch('/feedback/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE feedback SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Feedback status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    const { user_id, name, email, category, subject, message, rating } = req.body;
    const [result] = await db.query(
      'INSERT INTO feedback (user_id, name, email, category, subject, message, rating) VALUES (?,?,?,?,?,?,?)',
      [user_id || null, name, email, category, subject, message, rating]
    );
    res.status(201).json({ id: result.insertId, message: 'Feedback submitted. Thank you!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all feedback (admin)
router.get('/feedback', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/dashboard-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[pets]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Available") AS available, SUM(status="Adopted") AS adopted FROM pets');
    const [[apps]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Pending Review") AS pending FROM adoption_applications');
    const [[vols]] = await db.query('SELECT COUNT(*) AS total FROM volunteers WHERE status="Active"');
    const [[dons]] = await db.query('SELECT COALESCE(SUM(amount),0) AS raised FROM donations');

    // Use separate COUNT queries for lost_found — more reliable across MySQL versions
    const [[lfTotal]]    = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports`);
    const [[lfPending]]  = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports WHERE status = 'Pending Review'`);
    const [[lfApproved]] = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports WHERE status = 'Approved'`);
    const [[lfLost]]     = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports WHERE type = 'Lost' AND status NOT IN ('Reunited', 'Closed')`);
    const [[lfFound]]    = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports WHERE type = 'Found' AND status NOT IN ('Reunited', 'Closed')`);
    const [[lfReunited]] = await db.query(`SELECT COUNT(*) AS value FROM lost_found_reports WHERE status = 'Reunited'`);

    const lostFound = {
      total:    Number(lfTotal.value),
      pending:  Number(lfPending.value),
      approved: Number(lfApproved.value),
      lost:     Number(lfLost.value),
      found:    Number(lfFound.value),
      reunited: Number(lfReunited.value),
    };

    res.json({ pets, applications: apps, volunteers: vols, donations: dons, lostFound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get donations for a specific campaign
router.get('/campaigns/:id/donations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT donor_name, donor_email, amount, donated_at, message FROM donations WHERE campaign_id = ? ORDER BY donated_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;