const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // ✅ This is correct

// ⭐️ IMPORTANT: Create a strong, secret key.
// Don't use this one. Make up your own.
const JWT_SECRET = 'your_super_secret_key_12345';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
router.post('/register', async (req, res) => {
    const { name, username, password } = req.body;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // 2. Create new user
        user = new User({
            name,
            username,
            password,
        });

        // 3. Save user (password will be hashed by the pre-save hook)
        await user.save();

        // 4. Create and return token
        const payload = {
            user: {
                id: user.id,
            },
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
            },
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Log in a user
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. Create and return token
        const payload = {
            user: {
                id: user.id,
            },
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
            },
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;