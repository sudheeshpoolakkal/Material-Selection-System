// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (isMatch) {
            res.json({
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                token: generateToken(user.user_id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Register a new user (Added for testing purposes)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Check if user exists
        const [existingUsers] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const userRole = role || 'viewer';
        const [result] = await db.execute(
            'INSERT INTO Users (email, password_hash, role) VALUES (?, ?, ?)',
            [email, hashedPassword, userRole]
        );

        res.status(201).json({
            user_id: result.insertId,
            email,
            role: userRole,
            token: generateToken(result.insertId)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

module.exports = {
    login,
    register
};
