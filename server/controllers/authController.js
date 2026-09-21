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

        // --- Input validation ---
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

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
                name: user.name || '',
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

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // --- Input validation ---
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }
        const allowedRoles = ['admin', 'developer', 'viewer'];
        const userRole = allowedRoles.includes(role) ? role : 'viewer';
        const userName = (name || '').trim();

        // Check if user exists
        const [existingUsers] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'An account with that email already exists.' });
        }

        // Hash password with bcrypt (10 salt rounds) — plain-text password is NEVER stored
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await db.execute(
            'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [userName, email, hashedPassword, userRole]
        );

        res.status(201).json({
            user_id: result.insertId,
            name: userName,
            email,
            role: userRole,
            token: generateToken(result.insertId)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT user_id, name, email, role, created_at FROM Users WHERE user_id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user: users[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
};

// @desc    Update user profile (name, email)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.id;

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Email address cannot be empty.' });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = (name || '').trim();

        // Check if new email is already used by someone else
        const [existing] = await db.execute(
            'SELECT user_id FROM Users WHERE email = ? AND user_id != ?',
            [trimmedEmail, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'That email is already registered to another account.' });
        }

        await db.execute(
            'UPDATE Users SET name = ?, email = ? WHERE user_id = ?',
            [trimmedName, trimmedEmail, userId]
        );

        const [updated] = await db.execute(
            'SELECT user_id, name, email, role, created_at FROM Users WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updated[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
        }

        // Fetch user's existing password hash
        const [users] = await db.execute('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute('UPDATE Users SET password_hash = ? WHERE user_id = ?', [hashedPassword, userId]);

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error changing password' });
    }
};

module.exports = {
    login,
    register,
    getMe,
    updateProfile,
    changePassword
};
