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
      SELECT v.*, CONCAT(u.first_name, ' ', u.last_name) AS name, u.email, u.phone, u.profile_photo,
        COALESCE(sch.total_duties, 0)    AS total_duties,
        COALESCE(sch.hours_completed, 0) AS hours_completed
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN (
        SELECT volunteer_id,
               COUNT(*) AS total_duties,
               ROUND(COALESCE(SUM(CASE WHEN status = 'Completed'
                 THEN TIME_TO_SEC(TIMEDIFF(time_end, time_start)) / 3600 END), 0), 1) AS hours_completed
        FROM volunteer_schedules
        GROUP BY volunteer_id
      ) sch ON sch.volunteer_id = v.id
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
    const { availability, available_time, preferred_role, motivation, experience, volunteering_since } = req.body;
    const [result] = await db.query(
      'INSERT INTO volunteer_applications (user_id, availability, available_time, preferred_role, motivation, experience, volunteering_since) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, availability, available_time || null, preferred_role, motivation, experience, volunteering_since || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Volunteer application submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ NEW: Admin directly adds a volunteer (bypasses application flow)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone, availability, available_time, role, status } = req.body;

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
      'INSERT INTO volunteers (user_id, availability, available_time, role, status, start_date) VALUES (?,?,?,?,?,CURDATE())',
      [userId, availability, available_time || null, role, status || 'Active']
    );
    res.status(201).json({ id: result.insertId, message: 'Volunteer added successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Approve or Reject volunteer application
router.patch('/applications/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, criteria } = req.body;
    const [app] = await db.query('SELECT * FROM volunteer_applications WHERE id = ?', [req.params.id]);
    if (app.length === 0) return res.status(404).json({ error: 'Application not found' });

    await db.query(
      'UPDATE volunteer_applications SET status=?, criteria_json=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      [status, criteria && criteria.length ? JSON.stringify(criteria) : null, req.user.id, req.params.id]
    );


    if (status === 'Approved') {
      const [existing] = await db.query('SELECT id FROM volunteers WHERE user_id = ?', [app[0].user_id]);
      if (existing.length === 0) {
        // Not a volunteer yet — insert them
        await db.query(
          'INSERT INTO volunteers (user_id, availability, available_time, preferred_role, role, status, start_date, volunteering_since) VALUES (?,?,?,?,?,?,CURDATE(),?)',
          [app[0].user_id, app[0].availability, app[0].available_time || null, app[0].preferred_role, app[0].preferred_role, 'Active', app[0].volunteering_since || null]
        );
      } else {
        // Already exists — just update their info to Active
        await db.query(
          'UPDATE volunteers SET availability=?, available_time=?, role=?, status=?, start_date=CURDATE(), volunteering_since=? WHERE user_id=?',
          [app[0].availability, app[0].available_time || null, app[0].preferred_role, 'Active', app[0].volunteering_since || null, app[0].user_id]
        );
      }
    }

    // Drop a message into the applicant's in-app mailbox
    if (status === 'Approved' || status === 'Rejected') {
      const notifTitle = status === 'Approved'
        ? 'Volunteer Application Approved 🎉'
        : 'Volunteer Application Update';
      const notifMsg = status === 'Approved'
        ? 'Congratulations! Your volunteer application has been approved. Welcome to the PETLINK volunteer team — our coordinator will reach out with your first schedule.'
        : 'Thank you for your interest in volunteering with PETLINK. After careful review, we are unable to approve your application at this time. You are welcome to apply again in the future.';
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
        [app[0].user_id, notifTitle, notifMsg, 'volunteer']
      );
    }

    res.json({ message: `Application ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update volunteer record
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { availability, available_time, role, status } = req.body;
    await db.query(
      'UPDATE volunteers SET availability=?, available_time=?, role=?, status=? WHERE id=?',
      [availability, available_time || null, role, status, req.params.id]
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

// ================== DUTY SCHEDULING ==================

// Does this date fit the volunteer's day availability?
function dayAllowed(availability, dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday ... 6 = Saturday
  const weekend = day === 0 || day === 6;
  if (availability === 'Weekdays') return !weekend;
  if (availability === 'Weekends') return weekend;
  return true; // Both / Flexible
}

// Turn a time-slot label into an [earliest, latest] window
function slotRange(availableTime) {
  if (!availableTime) return null;
  const t = String(availableTime).toLowerCase();
  if (t.startsWith('morning'))   return ['08:00', '12:00'];
  if (t.startsWith('afternoon')) return ['12:00', '17:00'];
  if (t.startsWith('evening'))   return ['17:00', '21:00'];
  return null; // Whole day = no restriction
}

// List duties within a date range (for the weekly calendar)
router.get('/schedules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { start, end } = req.query;
    const [rows] = await db.query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) AS volunteer_name
       FROM volunteer_schedules s
       JOIN volunteers v ON s.volunteer_id = v.id
       JOIN users u ON v.user_id = u.id
       WHERE s.duty_date BETWEEN ? AND ?
       ORDER BY s.duty_date, s.time_start`,
      [start, end]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign a duty — with availability + double-booking checks
router.post('/schedules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { volunteer_id, duty, duty_date, time_start, time_end, notes } = req.body;

    if (!volunteer_id || !duty || !duty_date || !time_start || !time_end) {
      return res.status(400).json({ error: 'Volunteer, duty, date, and time are required.' });
    }
    if (time_end <= time_start) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    const [[vol]] = await db.query(
      `SELECT v.*, CONCAT(u.first_name, ' ', u.last_name) AS name
       FROM volunteers v JOIN users u ON v.user_id = u.id WHERE v.id = ?`,
      [volunteer_id]
    );
    if (!vol) return res.status(404).json({ error: 'Volunteer not found.' });
    if (vol.status !== 'Active') return res.status(400).json({ error: `${vol.name} is not an active volunteer.` });

    if (!dayAllowed(vol.availability, duty_date)) {
      return res.status(400).json({ error: `${vol.name} is only available on ${String(vol.availability).toLowerCase()}.` });
    }
    const range = slotRange(vol.available_time);
    if (range && (time_start < range[0] || time_end > range[1])) {
      return res.status(400).json({ error: `${vol.name} is only available during: ${vol.available_time}.` });
    }

    // No double-booking: reject if an existing duty on the same day overlaps this time
    const [clash] = await db.query(
      `SELECT id FROM volunteer_schedules
       WHERE volunteer_id = ? AND duty_date = ? AND status IN ('Scheduled','Completed')
         AND time_start < ? AND time_end > ?`,
      [volunteer_id, duty_date, time_end, time_start]
    );
    if (clash.length > 0) {
      return res.status(400).json({ error: `${vol.name} already has a duty that overlaps this time.` });
    }

    const [result] = await db.query(
      `INSERT INTO volunteer_schedules (volunteer_id, duty, duty_date, time_start, time_end, notes)
       VALUES (?,?,?,?,?,?)`,
      [volunteer_id, duty, duty_date, time_start, time_end, notes || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Duty assigned.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark a duty Completed / Missed / Cancelled
router.patch('/schedules/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Scheduled', 'Completed', 'Missed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    await db.query('UPDATE volunteer_schedules SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Duty marked ${status}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove a scheduled duty
router.delete('/schedules/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM volunteer_schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Duty removed.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================== NOTIFICATIONS ==================

// Get the logged-in user's notifications (newest first)
router.get('/notifications/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark all my notifications as read
router.patch('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked read.' });
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

// Get all donations (JOIN users so we get the donor's CURRENT profile photo, not a stale snapshot)
router.get('/donations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, u.profile_photo AS donor_photo
      FROM donations d
      LEFT JOIN users u ON d.donor_id = u.id
      ORDER BY d.donated_at DESC
    `);
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

// Admin manually records a donation (walk-ins, cheques, item drop-offs)
router.post('/donations/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      donor_name, donor_email, donor_phone, type,
      donation_kind, amount, payment_method,
      cheque_number, cheque_bank, cheque_date, received_by,
      item_category, item_description, item_quantity, handoff_method,
      message,
    } = req.body;

    const kind = donation_kind === 'Non-Monetary' ? 'Non-Monetary' : 'Monetary';

    if (!donor_name || !String(donor_name).trim()) {
      return res.status(400).json({ error: 'Donor name is required.' });
    }

    let amt = null;
    if (kind === 'Monetary') {
      amt = Number(amount);
      if (!amt || amt <= 0) return res.status(400).json({ error: 'A valid donation amount is required.' });
      if (payment_method === 'Cheque') {
        if (!cheque_number || !String(cheque_number).trim()) return res.status(400).json({ error: 'Cheque number is required.' });
        if (!cheque_bank || !String(cheque_bank).trim()) return res.status(400).json({ error: 'Issuing bank is required.' });
        if (!cheque_date) return res.status(400).json({ error: 'Cheque date is required.' });
        if (!received_by || !String(received_by).trim()) return res.status(400).json({ error: 'Please record who received the cheque.' });
      }
    } else {
      if (!item_category || !String(item_category).trim()) {
        return res.status(400).json({ error: 'Please specify what is being donated.' });
      }
      if (!received_by || !String(received_by).trim()) {
        return res.status(400).json({ error: 'Please record who received the items.' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO donations
        (donor_name, donor_email, donor_phone, type, donation_kind, amount,
         payment_method, cheque_number, cheque_bank, cheque_date, cheque_status, received_by,
         item_category, item_description, item_quantity, handoff_method, message)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        donor_name, donor_email || null, donor_phone || null, type || 'Individual',
        kind, amt,
        kind === 'Monetary' ? (payment_method || 'Cash') : null,
        payment_method === 'Cheque' ? cheque_number : null,
        payment_method === 'Cheque' ? cheque_bank : null,
        payment_method === 'Cheque' ? (cheque_date || null) : null,
        (kind === 'Monetary' && payment_method === 'Cheque') ? 'Pending' : null,
        (kind === 'Non-Monetary' || payment_method === 'Cheque') ? (received_by || null) : null,
        item_category || null, item_description || null, item_quantity || null,
        kind === 'Non-Monetary' ? (handoff_method || 'Drop-off') : null,
        message || null,
      ]
    );

    res.status(201).json({ id: result.insertId, message: 'Donation recorded.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update a cheque's status (Pending -> Cleared / Bounced)
router.patch('/donations/:id/cheque-status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { cheque_status } = req.body;
    if (!['Pending', 'Cleared', 'Bounced'].includes(cheque_status)) {
      return res.status(400).json({ error: 'Invalid cheque status.' });
    }
    await db.query('UPDATE donations SET cheque_status = ? WHERE id = ?', [cheque_status, req.params.id]);
    res.json({ message: `Cheque marked as ${cheque_status}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats — real counts from DB
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[volStats]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Active") AS active FROM volunteers');
    // Only money that actually arrived counts: cash/GCash/bank always, cheques only once Cleared
    const [[donStats]] = await db.query(`
      SELECT
        COUNT(DISTINCT donor_email) AS total_donors,
        COALESCE(SUM(CASE WHEN donation_kind='Monetary'
          AND (payment_method IS NULL OR payment_method <> 'Cheque' OR cheque_status = 'Cleared')
          THEN amount END),0) AS raised,
        COALESCE(SUM(CASE WHEN donation_kind='Monetary'
          AND (payment_method IS NULL OR payment_method <> 'Cheque' OR cheque_status = 'Cleared')
          AND MONTH(donated_at)=MONTH(NOW()) AND YEAR(donated_at)=YEAR(NOW())
          THEN amount END),0) AS raised_month,
        COALESCE(SUM(donation_kind='Monetary'),0) AS monetary_count,
        COALESCE(SUM(donation_kind='Non-Monetary'),0) AS non_monetary_count,
        COALESCE(SUM(CASE WHEN payment_method='Cheque' AND cheque_status='Pending' THEN amount END),0) AS pending_cheques
      FROM donations
    `);
    res.json({ volunteers: volStats, donations: donStats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;