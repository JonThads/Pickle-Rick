// =============================================================================
// Express app setup
// =============================================================================
// Split from server.js on purpose: `app.js` builds and configures the app,
// `server.js` actually starts it listening. Keeping them separate makes it
// possible to import `app` directly in tests later (e.g. with supertest)
// without opening a real network port.

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const courtRoutes = require('./routes/courtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const itemRoutes = require('./routes/itemRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors()); // allow the frontend (different origin) to call this API
app.use(express.json()); // parse JSON request bodies into req.body

// Uploaded profile photos - written here by middleware/upload.js.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simple health check - useful for Docker healthchecks, k6, and just
// confirming the server is up while you're developing.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/courts/:courtId/items', itemRoutes);

// 404 handler for any route that didn't match above.
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler MUST be registered last.
app.use(errorHandler);

module.exports = app;
