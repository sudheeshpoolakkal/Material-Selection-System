// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register', register);

// Example of a protected route using the middleware
router.get('/me', protect, (req, res) => {
    res.status(200).json({ message: 'Authenticated', user: req.user });
});

module.exports = router;
