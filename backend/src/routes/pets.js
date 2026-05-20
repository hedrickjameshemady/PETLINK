const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all pets (public)
router.get('/', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query;
    const params = [];

    if (status && status !== 'All Status') {
      query = 'SELECT * FROM pets WHERE status = ?';
      params.push(status);
    } else {
      query = "SELECT * FROM pets WHERE status != 'Adopted'";
    }

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (search) { query += ' AND (name LIKE ? OR breed LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get ALL pets including Adopted (admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pets ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ⚠️ MUST be before /:id — otherwise Express matches "assessments" as a pet ID
// Get all assessments with pet names (admin)
router.get('/assessments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ba.*, p.name AS pet_name, p.breed AS pet_breed
      FROM behavioral_assessments ba
      JOIN pets p ON ba.pet_id = p.id
      ORDER BY ba.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single pet with its latest assessment
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pet not found' });

    const [assessments] = await db.query(
      'SELECT * FROM behavioral_assessments WHERE pet_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    res.json({ ...rows[0], assessment: assessments[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create pet (admin/staff)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, type, breed, age_years, age_months, gender, color, weight, health_status, vaccination_status, neutered, microchipped, status, description, intake_date } = req.body;

    const count = await db.query('SELECT COUNT(*) as cnt FROM pets');
    const petId = `PET${String(count[0][0].cnt + 1).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO pets (pet_id, name, type, breed, age_years, age_months, gender, color, weight, health_status, vaccination_status, neutered, microchipped, status, description, intake_date, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [petId, name, type, breed, age_years, age_months, gender, color, weight, health_status, vaccination_status, neutered, microchipped, status || 'Available', description, intake_date, req.user.id]
    );
    res.status(201).json({ id: result.insertId, pet_id: petId, message: 'Pet added successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update pet
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, type, breed, age_years, gender, health_status, status, description } = req.body;
    await db.query(
      'UPDATE pets SET name=?, type=?, breed=?, age_years=?, gender=?, health_status=?, status=?, description=? WHERE id=?',
      [name, type, breed, age_years, gender, health_status, status, description, req.params.id]
    );
    res.json({ message: 'Pet updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete pet
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM pets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Pet deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add or update behavioral assessment for a pet
router.post('/:id/assessment', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { traits, description, compatibility_notes } = req.body;
    const [existing] = await db.query(
      'SELECT id FROM behavioral_assessments WHERE pet_id = ?', [req.params.id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE behavioral_assessments SET traits=?, description=?, compatibility_notes=?, assessed_by=? WHERE pet_id=?',
        [JSON.stringify(traits), description, compatibility_notes, req.user.id, req.params.id]
      );
    } else {
      await db.query(
        'INSERT INTO behavioral_assessments (pet_id, assessed_by, traits, description, compatibility_notes) VALUES (?,?,?,?,?)',
        [req.params.id, req.user.id, JSON.stringify(traits), description, compatibility_notes]
      );
    }
    res.json({ message: 'Assessment saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;