require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/adoptions', require('./routes/adoptions'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api', require('./routes/community'));
app.use('/api/lostfound', require('./routes/lostfound'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'PETLINK API running' }));

app.listen(PORT, () => console.log(`🐾 PETLINK API running on http://localhost:${PORT}`));