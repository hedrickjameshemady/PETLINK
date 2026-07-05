const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ─── Announcements upload config ───────────────────────────────────────────
const announcementUploadDir = path.join(__dirname, '../uploads/announcements');
if (!fs.existsSync(announcementUploadDir)) fs.mkdirSync(announcementUploadDir, { recursive: true });

const announcementStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, announcementUploadDir),
  filename: (req, file, cb) => cb(null, `ann_${Date.now()}_${file.fieldname}${path.extname(file.originalname)}`),
});
const uploadAnnouncement = multer({ storage: announcementStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Campaign banner upload config ──────────────────────────────────────────
const campaignUploadDir = path.join(__dirname, '../uploads/campaigns');
if (!fs.existsSync(campaignUploadDir)) fs.mkdirSync(campaignUploadDir, { recursive: true });

const campaignStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, campaignUploadDir),
  filename: (req, file, cb) => cb(null, `camp_${Date.now()}${path.extname(file.originalname)}`),
});
const uploadCampaign = multer({ storage: campaignStorage, limits: { fileSize: 10 * 1024 * 1024 } });


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
router.post('/campaigns', authMiddleware, adminMiddleware, uploadCampaign.single('banner'), async (req, res) => {
  try {
    const { title, type, status, description, target_amount, start_date, end_date, location } = req.body;
    const bannerUrl = req.file ? `/uploads/campaigns/${req.file.filename}` : null;
    const [result] = await db.query(
      'INSERT INTO campaigns (title, type, status, description, target_amount, start_date, end_date, location, banner_image, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [title, type, status || 'Upcoming', description, target_amount || null, start_date || null, end_date || null, location || null, bannerUrl, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Campaign created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update campaign
router.put('/campaigns/:id', authMiddleware, adminMiddleware, uploadCampaign.single('banner'), async (req, res) => {
  try {
    const { title, type, description, target_amount, start_date, end_date, location, status } = req.body;

    if (req.file) {
      const bannerUrl = `/uploads/campaigns/${req.file.filename}`;
      await db.query(
        'UPDATE campaigns SET title=?, type=?, description=?, target_amount=?, start_date=?, end_date=?, location=?, status=?, banner_image=? WHERE id=?',
        [title, type, description, target_amount || null, start_date || null, end_date || null, location || null, status, bannerUrl, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE campaigns SET title=?, type=?, description=?, target_amount=?, start_date=?, end_date=?, location=?, status=? WHERE id=?',
        [title, type, description, target_amount || null, start_date || null, end_date || null, location || null, status, req.params.id]
      );
    }
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

// Get single campaign — applies same status computation as GET /campaigns
router.get('/campaigns/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    const c = rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = c.start_date ? new Date(c.start_date) : null;
    const end = c.end_date ? new Date(c.end_date) : null;

    if (c.status !== 'Cancelled' && c.status !== 'Completed') {
      if (end && today > end) c.status = 'Completed';
      else if (start && today >= start) c.status = 'Active';
      else c.status = 'Upcoming';
    }

    res.json(c);
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

// Delete feedback (admin)
router.delete('/feedback/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM feedback WHERE id = ?', [req.params.id]);
    res.json({ message: 'Feedback deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Announcements & News ───────────────────────────────────────────────────
// Get all announcements (pinned first, then newest first)
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Post a new announcement (admin) — accepts optional photo and/or video
router.post(
  '/announcements',
  authMiddleware,
  adminMiddleware,
  uploadAnnouncement.fields([{ name: 'photo', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { headline, message } = req.body;
      const photoUrl = req.files?.photo?.[0] ? `/uploads/announcements/${req.files.photo[0].filename}` : null;
      const videoUrl = req.files?.video?.[0] ? `/uploads/announcements/${req.files.video[0].filename}` : null;

      const [result] = await db.query(
        'INSERT INTO announcements (headline, message, photo, video, created_by) VALUES (?,?,?,?,?)',
        [headline, message || null, photoUrl, videoUrl, req.user.id]
      );
      res.status(201).json({ id: result.insertId, message: 'Announcement posted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// Pin / unpin an announcement (admin)
router.patch('/announcements/:id/pin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { is_pinned } = req.body;
    await db.query('UPDATE announcements SET is_pinned=? WHERE id=?', [is_pinned ? 1 : 0, req.params.id]);
    res.json({ message: 'Announcement updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/dashboard-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[pets]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Available") AS available, SUM(status="Adopted") AS adopted FROM pets');
    const [[apps]] = await db.query('SELECT COUNT(*) AS total, SUM(status="Pending Review") AS pending FROM adoption_applications');
    const [[vols]] = await db.query('SELECT COUNT(*) AS total FROM volunteers WHERE status="Active"');
    const [[dons]] = await db.query('SELECT COALESCE(SUM(amount),0) AS raised FROM donations');

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

router.get('/campaigns/:id/donations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT donor_name, donor_email, amount, donated_at, message FROM donations WHERE campaign_id = ? ORDER BY donated_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get everyone who joined a non-donation event/campaign
router.get('/campaigns/:id/participants', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cp.id, cp.joined_at, u.first_name, u.last_name, u.email
       FROM campaign_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.campaign_id = ?
       ORDER BY cp.joined_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Dashboard detail data
router.get('/dashboard-detail', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [recentPets] = await db.query(
      `SELECT id, name, breed, type, gender, age_years, status, photo, created_at
       FROM pets ORDER BY created_at DESC LIMIT 4`
    );

    const [pendingAdoptions] = await db.query(
      `SELECT aa.id, aa.applied_at, aa.status, 'Adoption Application' AS app_type,
              CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
              u.profile_photo AS applicant_photo
       FROM adoption_applications aa
       JOIN users u ON aa.applicant_id = u.id
       WHERE aa.status = 'Pending Review'
       ORDER BY aa.applied_at DESC LIMIT 3`
    );
    const [pendingVolunteers] = await db.query(
      `SELECT va.id, va.applied_at, va.status, 'Volunteer Application' AS app_type,
              CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
              u.profile_photo AS applicant_photo
       FROM volunteer_applications va
       JOIN users u ON va.user_id = u.id
       WHERE va.status = 'Pending'
       ORDER BY va.applied_at DESC LIMIT 3`
    );
    const pendingApplications = [...pendingAdoptions, ...pendingVolunteers]
      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
      .slice(0, 3);

    const [upcomingEvents] = await db.query(
      `SELECT id, title, type, start_date, location, status
       FROM campaigns
       WHERE status IN ('Upcoming','Active')
       ORDER BY start_date ASC LIMIT 3`
    );

    const [[volTotal]] = await db.query(
      `SELECT COUNT(*) AS total FROM volunteers WHERE status = 'Active'`
    );
    const [newVolunteers] = await db.query(
      `SELECT v.id, CONCAT(u.first_name, ' ', u.last_name) AS name, v.role, v.created_at
       FROM volunteers v JOIN users u ON v.user_id = u.id
       WHERE v.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY v.created_at DESC LIMIT 5`
    );

    const [[donWeek]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM donations
       WHERE donated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const [[donPrevWeek]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM donations
       WHERE donated_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         AND donated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    const [topDonors] = await db.query(
      `SELECT donor_name, donor_email, SUM(amount) AS total_donated, COUNT(*) AS donation_count
       FROM donations
       GROUP BY donor_email, donor_name
       ORDER BY total_donated DESC LIMIT 3`
    );

    res.json({
      recentPets,
      pendingApplications,
      upcomingEvents,
      volunteers: {
        total: Number(volTotal.total),
        newSignups: newVolunteers,
      },
      donations: {
        thisWeek: Number(donWeek.total),
        prevWeek: Number(donPrevWeek.total),
        topDonors,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;