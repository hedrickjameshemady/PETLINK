const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Is this person staff?
const isStaff = (u) => u.role === 'admin' || u.role === 'staff';

/**
 * ══ USER SIDE ══
 * Get MY whole conversation with the shelter.
 * A user can only ever see their own thread — the thread id IS their user id.
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_photo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.thread_user_id = ?
       ORDER BY m.created_at ASC`,
      [req.user.id]
    );

    // Anything the ADMIN sent me is now considered read.
    await db.query(
      "UPDATE messages SET is_read = 1 WHERE thread_user_id = ? AND sender_role = 'admin' AND is_read = 0",
      [req.user.id]
    );

    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** USER SIDE — send a message to the shelter. */
router.post('/my', authMiddleware, async (req, res) => {
  try {
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 2000) return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });
    if (isStaff(req.user)) return res.status(400).json({ error: 'Admins should reply from the admin inbox.' });

    const [result] = await db.query(
      "INSERT INTO messages (thread_user_id, sender_id, sender_role, body) VALUES (?,?,'user',?)",
      [req.user.id, req.user.id, body]
    );
    res.status(201).json({ id: result.insertId, message: 'Sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** USER SIDE — just the unread count, for the little red dot on the bubble. */
router.get('/my/unread', authMiddleware, async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT COUNT(*) AS unread FROM messages WHERE thread_user_id = ? AND sender_role = 'admin' AND is_read = 0",
      [req.user.id]
    );
    res.json({ unread: row.unread });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * ══ ADMIN SIDE ══
 * The inbox: one row per user who has ever messaged, newest activity first.
 */
router.get('/threads', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id AS thread_user_id,
        u.first_name, u.last_name, u.email, u.profile_photo,
        (SELECT body FROM messages
          WHERE thread_user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages
          WHERE thread_user_id = u.id ORDER BY created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*) FROM messages
          WHERE thread_user_id = u.id AND sender_role = 'user' AND is_read = 0) AS unread
      FROM users u
      WHERE EXISTS (SELECT 1 FROM messages WHERE thread_user_id = u.id)
      ORDER BY unread DESC, last_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ADMIN SIDE — open one user's thread. */
router.get('/threads/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_photo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.thread_user_id = ?
       ORDER BY m.created_at ASC`,
      [req.params.userId]
    );

    // Everything the USER sent is now read.
    await db.query(
      "UPDATE messages SET is_read = 1 WHERE thread_user_id = ? AND sender_role = 'user' AND is_read = 0",
      [req.params.userId]
    );

    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ADMIN SIDE — reply into a user's thread. */
router.post('/threads/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > 2000) return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });

    // Make sure the target user actually exists
    const [target] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.userId]);
    if (target.length === 0) return res.status(404).json({ error: 'User not found.' });

    // thread_user_id stays the USER's id. sender_id is the admin. That's the whole trick.
    const [result] = await db.query(
      "INSERT INTO messages (thread_user_id, sender_id, sender_role, body) VALUES (?,?,'admin',?)",
      [req.params.userId, req.user.id, body]
    );

    // Also drop a notification so the bell lights up even if their chat is closed
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,'general')",
      [req.params.userId, 'New message from PETLINK', body.slice(0, 120)]
    );

    res.status(201).json({ id: result.insertId, message: 'Sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** ADMIN SIDE — total unread across ALL threads, for the sidebar badge. */
router.get('/threads/meta/unread', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT COUNT(*) AS unread FROM messages WHERE sender_role = 'user' AND is_read = 0"
    );
    res.json({ unread: row.unread });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;