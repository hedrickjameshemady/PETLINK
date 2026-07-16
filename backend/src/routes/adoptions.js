const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware, reviewerMiddleware } = require('../middleware/auth');

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
    const {
      pet_id, has_yard, other_pets, children_at_home,
      experience_with_pets, reason_for_adoption, preferred_contact, phone_number,
      housing_type, rent_or_own, landlord_allows_pets, household_size, family_agrees,
      allergies, previous_pets, current_pets_neutered, vet_info, hours_alone,
      who_cares_when_away, can_afford_care, if_you_move, lifetime_commitment, home_visit_ok
    } = req.body;

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
      `INSERT INTO adoption_applications
        (application_id, applicant_id, pet_id, has_yard, other_pets, children_at_home,
         experience_with_pets, reason_for_adoption, preferred_contact, phone_number,
         housing_type, rent_or_own, landlord_allows_pets, household_size, family_agrees,
         allergies, previous_pets, current_pets_neutered, vet_info, hours_alone,
         who_cares_when_away, can_afford_care, if_you_move, lifetime_commitment, home_visit_ok)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [appId, req.user.id, pet_id, has_yard, other_pets || null, children_at_home || null,
       experience_with_pets || null, reason_for_adoption, preferred_contact, phone_number || null,
       housing_type || null, rent_or_own || null, landlord_allows_pets || null, household_size || null, family_agrees || null,
       allergies || null, previous_pets || null, current_pets_neutered || null, vet_info || null, hours_alone || null,
       who_cares_when_away || null, can_afford_care || null, if_you_move || null, lifetime_commitment || null, home_visit_ok || null]
    );

    // NOTE: We do NOT change the pet's global status here.
    // "Pending" is now per-user, derived from that user's own applications.

    res.status(201).json({ id: result.insertId, application_id: appId, message: 'Application submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve/Reject application (admin, staff, or the pet's own foster)
router.patch('/:id/status', authMiddleware, reviewerMiddleware, async (req, res) => {
  try {
    const { status, review_notes } = req.body;

    // A foster may only decide on applicants for pets THEY foster.
    if (req.user.role === 'foster') {
      const [chk] = await db.query(
        `SELECT aa.id FROM adoption_applications aa
         JOIN pets p ON aa.pet_id = p.id
         WHERE aa.id = ? AND p.fostered_by = ?`,
        [req.params.id, req.user.id]
      );
      if (chk.length === 0) return res.status(403).json({ error: 'Not your foster pet' });
    }

    await db.query(
      'UPDATE adoption_applications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=NOW() WHERE id=?',
      [status, req.user.id, review_notes, req.params.id]
    );

    // Look up who applied + which pet, so we can notify them by name.
    const [decided] = await db.query(
      `SELECT aa.applicant_id, p.id AS pet_id, p.name AS pet_name
       FROM adoption_applications aa JOIN pets p ON aa.pet_id = p.id
       WHERE aa.id = ?`,
      [req.params.id]
    );

    if (status === 'Approved') {
      const petId = decided[0].pet_id;
      await db.query("UPDATE pets SET status = 'Adopted' WHERE id = ?", [petId]);

      // Everyone else still pending for this pet gets auto-rejected...
      await db.query(
        "UPDATE adoption_applications SET status = 'Rejected', review_notes = 'Another applicant was selected.' WHERE pet_id = ? AND id != ? AND status = 'Pending Review'",
        [petId, req.params.id]
      );

      // ...and we notify each of those auto-rejected applicants too.
      const [others] = await db.query(
        "SELECT applicant_id FROM adoption_applications WHERE pet_id = ? AND id != ? AND status = 'Rejected' AND review_notes = 'Another applicant was selected.'",
        [petId, req.params.id]
      );
      for (const o of others) {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
          [o.applicant_id, 'Adoption Update',
           `Thank you for applying to adopt ${decided[0].pet_name}. Another applicant was selected this time, but we truly appreciate your interest and hope you'll consider adopting another pet.`,
           'adoption']
        );
      }
    }

    // Notify the applicant whose status we just set.
    const notifMsg = status === 'Approved'
      ? `Congratulations! Your application to adopt ${decided[0].pet_name} has been approved. Our team will contact you soon with the next steps.`
      : `Thank you for applying to adopt ${decided[0].pet_name}. After careful review, we're unable to approve your application at this time. You're welcome to apply for other pets.`;
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
      [decided[0].applicant_id, 'Adoption Update', notifMsg, 'adoption']
    );

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

// ─── Delete an application (admin/staff) — frontend already calls this ───
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM adoption_applications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Application deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REVIEWERS: all applicants for ONE pet, sorted best-star-average first ───
// Fosters may only view applicants for pets they foster.
router.get('/pet/:petId/applicants', authMiddleware, reviewerMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'foster') {
      const [own] = await db.query('SELECT id FROM pets WHERE id = ? AND fostered_by = ?', [req.params.petId, req.user.id]);
      if (own.length === 0) return res.status(403).json({ error: 'Not your foster pet' });
    }
    const [rows] = await db.query(
      `SELECT aa.*,
        CONCAT(u.first_name,' ',u.last_name) AS applicant_name,
        u.email AS applicant_email,
        u.profile_photo AS applicant_photo,
        (SELECT ROUND(AVG(r.stars),2) FROM adoption_ratings r WHERE r.application_id = aa.id) AS avg_stars,
        (SELECT COUNT(DISTINCT r.reviewer_id) FROM adoption_ratings r WHERE r.application_id = aa.id) AS rating_count,
        (SELECT ROUND(AVG(r.stars),2) FROM adoption_ratings r WHERE r.application_id = aa.id AND r.reviewer_id = ?) AS my_stars
       FROM adoption_applications aa
       JOIN users u ON aa.applicant_id = u.id
       WHERE aa.pet_id = ?
       ORDER BY (avg_stars IS NULL), avg_stars DESC, aa.applied_at ASC`,
      [req.user.id, req.params.petId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REVIEWERS: per-criterion ratings on ONE application, grouped by reviewer ───
router.get('/:appId/ratings', authMiddleware, reviewerMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.criteria, r.stars, r.comment, r.reviewer_id,
              CONCAT(u.first_name,' ',u.last_name) AS reviewer_name, u.role AS reviewer_role
       FROM adoption_ratings r JOIN users u ON r.reviewer_id = u.id
       WHERE r.application_id = ?
       ORDER BY reviewer_name ASC`,
      [req.params.appId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REVIEWERS: just MY own per-criterion scores on one application ───
router.get('/:appId/ratings/mine', authMiddleware, reviewerMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT criteria, stars, comment FROM adoption_ratings WHERE application_id = ? AND reviewer_id = ?',
      [req.params.appId, req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// The 7 criteria reviewers score. Keep this list in sync with the frontend.
const RATING_CRITERIA = [
  'housing_environment',
  'financial_readiness',
  'pet_experience',
  'household_support',
  'care_planning',
  'long_term_commitment',
  'verification_willingness',
];

// ─── REVIEWERS: save (or change) per-criterion 1-5 star ratings on one applicant ───
// Body: { ratings: { housing_environment: 4, financial_readiness: 5, ... }, comment?: string }
router.post('/:appId/rate', authMiddleware, reviewerMiddleware, async (req, res) => {
  try {
    const { ratings, comment } = req.body;
    if (!ratings || typeof ratings !== 'object') {
      return res.status(400).json({ error: 'ratings object is required' });
    }

    // If this reviewer is a foster, make sure the applicant is for one of THEIR pets.
    if (req.user.role === 'foster') {
      const [chk] = await db.query(
        `SELECT aa.id FROM adoption_applications aa
         JOIN pets p ON aa.pet_id = p.id
         WHERE aa.id = ? AND p.fostered_by = ?`,
        [req.params.appId, req.user.id]
      );
      if (chk.length === 0) return res.status(403).json({ error: 'Not your foster pet' });
    }

    // Upsert one row per criterion. Skip any criterion the reviewer left unrated.
    for (const key of RATING_CRITERIA) {
      const s = Number(ratings[key]);
      if (!s || s < 1 || s > 5) continue; // not rated yet — leave it out

      const [ex] = await db.query(
        'SELECT id FROM adoption_ratings WHERE application_id = ? AND reviewer_id = ? AND criteria = ?',
        [req.params.appId, req.user.id, key]
      );
      if (ex.length) {
        await db.query('UPDATE adoption_ratings SET stars = ?, comment = ? WHERE id = ?', [s, comment || null, ex[0].id]);
      } else {
        await db.query(
          'INSERT INTO adoption_ratings (application_id, reviewer_id, criteria, stars, comment) VALUES (?,?,?,?,?)',
          [req.params.appId, req.user.id, key, s, comment || null]
        );
      }
    }
    res.json({ message: 'Rating saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FOSTER: list the pets I foster (with a pending-applicant count) ───
router.get('/foster/my-pets', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'foster') return res.status(403).json({ error: 'Fosters only' });
    const [rows] = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM adoption_applications aa WHERE aa.pet_id = p.id) AS applicant_count,
        (SELECT COUNT(*) FROM adoption_applications aa WHERE aa.pet_id = p.id AND aa.status = 'Pending Review') AS pending_count
       FROM pets p WHERE p.fostered_by = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;