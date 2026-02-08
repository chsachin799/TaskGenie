const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Serve Shared Page
app.get('/shared/:hash', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/shared.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn("\x1b[33m%s\x1b[0m", "WARNING: GEMINI_API_KEY is not set in .env file. Voice features will not work.");
    } else {
        console.log("\x1b[32m%s\x1b[0m", "GEMINI_API_KEY detected. Neural Core Online.");
    }
});
