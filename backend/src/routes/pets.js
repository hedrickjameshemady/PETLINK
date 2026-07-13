const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Reads the logged-in user if a valid token is present, but never blocks anonymous access.
const jwt = require('jsonwebtoken');
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'petlink_secret');
    } catch { /* invalid token → treat as anonymous */ }
  }
  next();
}

const uploadDir = path.join(__dirname, '../uploads/pets');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `pet_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });


// Get all pets (public) — includes per-user "my_pending" flag when logged in
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const params = [];
    const userId = req.user ? req.user.id : 0;

    // Subquery: does THIS user have a pending application on this pet?
    let query = `
      SELECT p.*,
        EXISTS(
          SELECT 1 FROM adoption_applications aa
          WHERE aa.pet_id = p.id AND aa.applicant_id = ? AND aa.status = 'Pending Review'
        ) AS my_pending
      FROM pets p
      WHERE `;
    params.push(userId);

    if (status && status !== 'All Status') {
      query += 'p.status = ?';
      params.push(status);
    } else {
      query += "p.status != 'Adopted'";
    }

    if (type) { query += ' AND p.type = ?'; params.push(type); }
    if (search) { query += ' AND (p.name LIKE ? OR p.breed LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY p.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get ALL pets including Adopted (admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pets ORDER BY pet_id ASC');
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

// Get single pet with its latest assessment + per-user pending flag
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 0;
    const [rows] = await db.query(
      `SELECT p.*,
        EXISTS(
          SELECT 1 FROM adoption_applications aa
          WHERE aa.pet_id = p.id AND aa.applicant_id = ? AND aa.status = 'Pending Review'
        ) AS my_pending
       FROM pets p WHERE p.id = ?`,
      [userId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pet not found' });

    const [assessments] = await db.query(
      'SELECT * FROM behavioral_assessments WHERE pet_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    res.json({ ...rows[0], assessment: assessments[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create pet (admin/staff)
router.post('/', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { name, type, breed, age_years, age_months, gender, color, weight, health_status, vaccination_status, neutered, microchipped, status, description, intake_date, vet_name, clinic_name, last_checkup_date, vaccines_given, medical_notes, vaccine_log, neutered_date } = req.body;
    const photoUrl = req.file ? `/uploads/pets/${req.file.filename}` : null;

    // FormData turns everything into TEXT. The string "false" is TRUTHY in JS!
    // So we must compare against the actual word "true".
    const toBool = (v) => (v === true || v === 'true' || v === 1 || v === '1') ? 1 : 0;
    // Turn empty strings / "null" / "undefined" into a real SQL NULL
    const nullify = (v) => (v === '' || v === undefined || v === null || v === 'null' || v === 'undefined') ? null : v;
    // Numbers: blank should be NULL, not 0
    const num = (v) => (v === '' || v === undefined || v === null || v === 'null') ? null : Number(v);
    // An empty vaccine list should be NULL, not the text "[]"
    const cleanLog = (v) => (!v || v === '[]' || v === 'null') ? null : v;

    const isVaccinated = toBool(vaccination_status);
    const isNeutered = toBool(neutered);

    const [[maxRow]] = await db.query("SELECT MAX(CAST(SUBSTRING(pet_id, 4) AS UNSIGNED)) as maxNum FROM pets");
    const nextId = (maxRow.maxNum || 0) + 1;
    const petId = `PET${String(nextId).padStart(3, '0')}`;

    const [result] = await db.query(
      `INSERT INTO pets (pet_id, name, type, breed, age_years, age_months, gender, color, weight, health_status, vaccination_status, neutered, microchipped, status, description, intake_date, created_by, photo, vet_name, clinic_name, last_checkup_date, vaccines_given, medical_notes, neutered_date, vaccine_log)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        petId, name, type, nullify(breed),
        num(age_years), num(age_months),
        gender, nullify(color), num(weight),
        health_status || 'Good',
        isVaccinated,
        isNeutered,
        toBool(microchipped),
        status || 'Available',
        nullify(description),
        nullify(intake_date),
        req.user.id, photoUrl,
        nullify(vet_name), nullify(clinic_name), nullify(last_checkup_date),
        nullify(vaccines_given), nullify(medical_notes),
        isNeutered ? nullify(neutered_date) : null,      // no date if not neutered
        isVaccinated ? cleanLog(vaccine_log) : null,     // no log if not vaccinated
      ]
    );
    res.status(201).json({ id: result.insertId, pet_id: petId, message: 'Pet added successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update pet
router.put('/:id', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { name, type, breed, age_years, gender, weight, color, intake_date, health_status, status, description, vet_name, clinic_name, last_checkup_date, vaccines_given, medical_notes, vaccination_status, neutered, neutered_date, vaccine_log } = req.body;
    const nullify = (v) => (v === '' || v === undefined || v === null || v === 'null' || v === 'undefined') ? null : v;
    const toBool = (v) => (v === true || v === 'true' || v === 1 || v === '1') ? 1 : 0;
    const num = (v) => (v === '' || v === undefined || v === null || v === 'null') ? null : Number(v);
    const cleanLog = (v) => (!v || v === '[]' || v === 'null') ? null : v;

    const isVaccinated = toBool(vaccination_status);
    const isNeutered = toBool(neutered);

    const fields = [
      name, type, nullify(breed), num(age_years), gender,
      num(weight), nullify(color), nullify(intake_date),
      health_status, status, nullify(description),
      nullify(vet_name), nullify(clinic_name), nullify(last_checkup_date),
      nullify(vaccines_given), nullify(medical_notes),
      isVaccinated,
      isNeutered,
      isNeutered ? nullify(neutered_date) : null,
      isVaccinated ? cleanLog(vaccine_log) : null,
    ];
    let query = 'UPDATE pets SET name=?, type=?, breed=?, age_years=?, gender=?, weight=?, color=?, intake_date=?, health_status=?, status=?, description=?, vet_name=?, clinic_name=?, last_checkup_date=?, vaccines_given=?, medical_notes=?, vaccination_status=?, neutered=?, neutered_date=?, vaccine_log=?';
    if (req.file) {
      query += ', photo=?';
      fields.push(`/uploads/pets/${req.file.filename}`);
    }
    query += ' WHERE id=?';
    fields.push(req.params.id);
    await db.query(query, fields);
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