// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Ensure DB connects on startup
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Basic health check endpoint
app.get('/', (req, res) => {
    res.send('Material Optimization DBMS API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
