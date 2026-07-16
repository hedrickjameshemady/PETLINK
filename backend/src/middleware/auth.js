const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'petlink_secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Only a real admin (not staff) — used for creating other accounts if you ever want to lock it down.
// NOTE: You asked that BOTH admin and staff can create accounts, so we use adminMiddleware for that.
const superAdminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

// Reviewers = anyone allowed to STAR-RATE adoption applicants: admin, staff, or a foster.
const reviewerMiddleware = (req, res, next) => {
  const r = req.user.role;
  if (r === 'admin' || r === 'staff' || r === 'foster') return next();
  return res.status(403).json({ error: 'Access denied' });
};

// Lost & Found managers (plus admin/staff, who can do everything).
const lostFoundMiddleware = (req, res, next) => {
  const r = req.user.role;
  if (r === 'admin' || r === 'staff' || r === 'lost_found_manager') return next();
  return res.status(403).json({ error: 'Access denied' });
};

module.exports = { authMiddleware, adminMiddleware, superAdminMiddleware, reviewerMiddleware, lostFoundMiddleware };
