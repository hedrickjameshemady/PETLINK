const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all applications (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT aa.*, 
        CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
        u.email AS applicant_email,
        u.profile_photo AS applicant_photo,
        p.name AS pet_name, p.breed AS pet_breed
      FROM adoption_applications aa
      JOIN users u ON aa.applicant_id = u.id
      JOIN pets p ON aa.pet_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND aa.status = ?'; params.push(status); }
    query += ' ORDER BY aa.applied_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get user's own applications
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT aa.*, p.name AS pet_name, p.breed AS pet_breed, p.type AS pet_type, p.photo AS pet_photo
       FROM adoption_applications aa JOIN pets p ON aa.pet_id = p.id
       WHERE aa.applicant_id = ? ORDER BY aa.applied_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Submit application
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, living_situation, has_yard, other_pets, children_at_home, experience_with_pets, reason_for_adoption, preferred_contact } = req.body;

    // Prevent duplicate active applications from the same user for the same pet
    const [dupe] = await db.query(
      "SELECT id FROM adoption_applications WHERE applicant_id = ? AND pet_id = ? AND status = 'Pending Review'",
      [req.user.id, pet_id]
    );
    if (dupe.length > 0) {
      return res.status(409).json({ error: 'You already have a pending application for this pet.' });
    }

    const [[maxRow]] = await db.query('SELECT MAX(id) as maxId FROM adoption_applications');
    const nextNum = (maxRow.maxId || 0) + 1;
    const appId = `APP${String(nextNum).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO adoption_applications (application_id, applicant_id, pet_id, living_situation, has_yard, other_pets, children_at_home, experience_with_pets, reason_for_adoption, preferred_contact)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [appId, req.user.id, pet_id, living_situation, has_yard, other_pets, children_at_home, experience_with_pets, reason_for_adoption, preferred_contact]
    );

    // NOTE: We do NOT change the pet's global status here.
    // "Pending" is now per-user, derived from that user's own applications.

    res.status(201).json({ id: result.insertId, application_id: appId, message: 'Application submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve/Reject application
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, review_notes } = req.body;
    await db.query(
      'UPDATE adoption_applications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=NOW() WHERE id=?',
      [status, req.user.id, review_notes, req.params.id]
    );

    if (status === 'Approved') {
      const [app] = await db.query('SELECT pet_id FROM adoption_applications WHERE id = ?', [req.params.id]);
      await db.query("UPDATE pets SET status = 'Adopted' WHERE id = ?", [app[0].pet_id]);
      await db.query(
        "UPDATE adoption_applications SET status = 'Rejected', review_notes = 'Another applicant was selected.' WHERE pet_id = ? AND id != ? AND status = 'Pending Review'",
        [app[0].pet_id, req.params.id]
      );
    }
    // On 'Rejected' we do nothing to the pet — it was never globally Pending.

    res.json({ message: `Application ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all adopted pets with adopter info + follow-up summary (admin)
router.get('/adopted', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        aa.id AS application_id,
        aa.applicant_id,
        aa.reviewed_at AS adopted_at,
        CONCAT(u.first_name, ' ', u.last_name) AS adopter_name,
        u.email AS adopter_email,
        u.profile_photo AS adopter_photo,
        p.id AS pet_id, p.pet_id AS pet_code, p.name AS pet_name,
        p.type AS pet_type, p.breed AS pet_breed,
        (SELECT COUNT(*) FROM adoption_followups f WHERE f.application_id = aa.id) AS followup_count,
        (SELECT MAX(f.followup_date) FROM adoption_followups f WHERE f.application_id = aa.id) AS last_followup
      FROM adoption_applications aa
      JOIN users u ON aa.applicant_id = u.id
      JOIN pets p ON aa.pet_id = p.id
      WHERE aa.status = 'Approved' AND p.status = 'Adopted'
      ORDER BY aa.reviewed_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List follow-ups for one adoption (admin)
router.get('/:id/followups', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.*, CONCAT(u.first_name, ' ', u.last_name) AS admin_name
      FROM adoption_followups f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.application_id = ?
      ORDER BY f.followup_date DESC, f.id DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add a follow-up to an adoption (admin)
router.post('/:id/followups', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { followup_date, outcome, notes } = req.body;
    if (!followup_date) return res.status(400).json({ error: 'Follow-up date is required' });
    const [result] = await db.query(
      'INSERT INTO adoption_followups (application_id, followup_date, outcome, notes, created_by) VALUES (?,?,?,?,?)',
      [req.params.id, followup_date, outcome || 'Doing Well', notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Follow-up recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;