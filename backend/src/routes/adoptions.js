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

    const count = await db.query('SELECT COUNT(*) as cnt FROM adoption_applications');
    const appId = `APP${String(count[0][0].cnt + 1).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO adoption_applications (application_id, applicant_id, pet_id, living_situation, has_yard, other_pets, children_at_home, experience_with_pets, reason_for_adoption, preferred_contact)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [appId, req.user.id, pet_id, living_situation, has_yard, other_pets, children_at_home, experience_with_pets, reason_for_adoption, preferred_contact]
    );
    
    // Update pet status to Pending
    await db.query("UPDATE pets SET status = 'Pending' WHERE id = ?", [pet_id]);

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
    } else if (status === 'Rejected') {
      const [app] = await db.query('SELECT pet_id FROM adoption_applications WHERE id = ?', [req.params.id]);
      await db.query("UPDATE pets SET status = 'Available' WHERE id = ?", [app[0].pet_id]);
    }
    res.json({ message: `Application ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
