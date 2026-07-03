const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Storage for donation proof-of-payment files
const proofDir = path.join(__dirname, '../uploads/donations');
if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });
const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, proofDir),
  filename: (req, file, cb) => cb(null, `proof_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadProof = multer({ storage: proofStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// ================== VOLUNTEERS ==================

// Get all active volunteers (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, CONCAT(u.first_name, ' ', u.last_name) AS name, u.email, u.phone, u.profile_photo
      FROM volunteers v JOIN users u ON v.user_id = u.id
      ORDER BY v.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get volunteer applications
router.get('/applications', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT va.*, CONCAT(u.first_name, ' ', u.last_name) AS name, u.email, u.phone, u.profile_photo
      FROM volunteer_applications va JOIN users u ON va.user_id = u.id
      ORDER BY va.applied_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Apply as volunteer (public users)
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { availability, preferred_role, motivation, experience } = req.body;
    const [result] = await db.query(
      'INSERT INTO volunteer_applications (user_id, availability, preferred_role, motivation, experience) VALUES (?,?,?,?,?)',
      [req.user.id, availability, preferred_role, motivation, experience]
    );
    res.status(201).json({ id: result.insertId, message: 'Volunteer application submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: Admin directly adds a volunteer (bypasses application flow)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone, availability, role, status } = req.body;

    // Check if a user account exists for this email
    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    let userId;
    if (users.length > 0) {
      userId = users[0].id;
    } else {
      // Create a placeholder user account so the FK constraint is satisfied
      const nameParts = (name || '').trim().split(' ');
      const firstName = nameParts[0] || name;
      const lastName = nameParts.slice(1).join(' ') || '';
      const [newUser] = await db.query(
        `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
         VALUES (?, ?, ?, ?, 'placeholder', 'volunteer')`,
        [firstName, lastName, email || `volunteer_${Date.now()}@petlink.local`, phone || null]
      );
      userId = newUser.insertId;
    }

    const [result] = await db.query(
      'INSERT INTO volunteers (user_id, availability, role, status, start_date) VALUES (?,?,?,?,CURDATE())',
      [userId, availability, role, status || 'Active']
    );
    res.status(201).json({ id: result.insertId, message: 'Volunteer added successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve or Reject volunteer application
router.patch('/applications/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const [app] = await db.query('SELECT * FROM volunteer_applications WHERE id = ?', [req.params.id]);
    if (app.length === 0) return res.status(404).json({ error: 'Application not found' });

    await db.query('UPDATE volunteer_applications SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?', [status, req.user.id, req.params.id]);


    if (status === 'Approved') {
      const [existing] = await db.query('SELECT id FROM volunteers WHERE user_id = ?', [app[0].user_id]);
      if (existing.length === 0) {
        // Not a volunteer yet — insert them
        await db.query(
          'INSERT INTO volunteers (user_id, availability, preferred_role, role, status, start_date) VALUES (?,?,?,?,?,CURDATE())',
          [app[0].user_id, app[0].availability, app[0].preferred_role, app[0].preferred_role, 'Active']
        );
      } else {
        // Already exists — just update their info to Active
        await db.query(
          'UPDATE volunteers SET availability=?, role=?, status=?, start_date=CURDATE() WHERE user_id=?',
          [app[0].availability, app[0].preferred_role, 'Active', app[0].user_id]
        );
      }
    }
    res.json({ message: `Application ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update volunteer record
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { availability, role, status } = req.body;
    await db.query(
      'UPDATE volunteers SET availability=?, role=?, status=? WHERE id=?',
      [availability, role, status, req.params.id]
    );
    res.json({ message: 'Volunteer updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete volunteer record
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM volunteers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Volunteer removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== DONATIONS ==================
// Get donations by the logged-in user
router.get('/donations/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, c.title AS campaign_title
       FROM donations d
       LEFT JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.donor_id = ?
       ORDER BY d.donated_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all donations
router.get('/donations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donations ORDER BY donated_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/donations', uploadProof.single('proof'), async (req, res) => {
  try {
    const {
      donor_id, donor_name, donor_email, donor_phone, type, purpose, message, campaign_id,
      donation_kind, amount,
      item_category, item_description, item_quantity,
      handoff_method, pickup_address, pickup_date,
      courier_name, tracking_number, contact_phone,
    } = req.body;

    const kind = donation_kind === 'Non-Monetary' ? 'Non-Monetary' : 'Monetary';

    // ---- Server-side validation ----
    let amt = null;
    if (kind === 'Monetary') {
      amt = Number(amount);
      if (!amt || amt <= 0) {
        return res.status(400).json({ error: 'A valid donation amount is required.' });
      }
    } else {
      if (!item_category || !String(item_category).trim()) {
        return res.status(400).json({ error: 'Please specify what you are donating.' });
      }
      if (!['Pickup', 'Drop-off', 'Courier'].includes(handoff_method)) {
        return res.status(400).json({ error: 'Please select how the donation will reach us.' });
      }
      if (handoff_method === 'Pickup') {
        if (!pickup_address || !String(pickup_address).trim()) {
          return res.status(400).json({ error: 'A pickup address is required for Street Paws pickup.' });
        }
        if (!contact_phone || !String(contact_phone).trim()) {
          return res.status(400).json({ error: 'A contact number is required for pickup.' });
        }
      }
      if (handoff_method === 'Courier') {
        if (!courier_name || !String(courier_name).trim()) {
          return res.status(400).json({ error: 'Please enter the courier name.' });
        }
        if (!tracking_number || !String(tracking_number).trim()) {
          return res.status(400).json({ error: 'Please enter the tracking number.' });
        }
      }
    }

    const proofUrl = req.file ? `/uploads/donations/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO donations
        (donor_id, donor_name, donor_email, donor_phone, type, donation_kind, amount,
         item_category, item_description, item_quantity, handoff_method, pickup_address,
         pickup_date, courier_name, tracking_number, contact_phone,
         purpose, message, campaign_id, proof_file)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        donor_id || null, donor_name || null, donor_email || null, donor_phone || null,
        type || 'Individual', kind, amt,
        item_category || null, item_description || null, item_quantity || null,
        handoff_method || null, pickup_address || null,
        pickup_date || null, courier_name || null, tracking_number || null, contact_phone || null,
        purpose || null, message || null, campaign_id || null, proofUrl,
      ]
    );

    // Only monetary donations contribute to a campaign's raised amount
    if (kind === 'Monetary' && campaign_id) {
      await db.query(
        'UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?',
        [amt, campaign_id]
      );
    }

    res.status(201).json({ id: result.insertId, message: 'Donation recorded. Thank you!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats — real counts from DB
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[volStats]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Active") AS active FROM volunteers');
    const [[donStats]] = await db.query("SELECT COUNT(DISTINCT donor_email) AS total_donors, COALESCE(SUM(amount),0) AS raised FROM donations WHERE donation_kind='Monetary'");
    res.json({ volunteers: volStats, donations: donStats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;