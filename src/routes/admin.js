const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Middleware to ensure admin is authenticated
const ensureAdmin = (req, res, next) => {
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

// Get all users
router.get('/users', ensureAdmin, async (req, res) => {
    try {
        const usersPath = path.join(__dirname, '../data/users.json');
        const usersData = await fs.readFile(usersPath, 'utf8');
        const users = JSON.parse(usersData);
        
        res.json({
            success: true,
            users: users.users,
            admins: [] // Add admins handling if needed
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Add new user
router.post('/users', ensureAdmin, async (req, res) => {
    try {
        const { email, role } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const usersPath = path.join(__dirname, '../data/users.json');
        const usersData = await fs.readFile(usersPath, 'utf8');
        const usersObj = JSON.parse(usersData);

        // Check if user already exists
        if (usersObj.users.some(user => user.email === email)) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Generate TOTP secret
        const secret = generateTOTPSecret();

        // Create new user object
        const newUser = {
            email,
            secret,
            verified: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            role: role || 'user'
        };

        // Add user to array
        usersObj.users.push(newUser);

        // Write updated data back to file
        await fs.writeFile(
            usersPath,
            JSON.stringify(usersObj, null, 2),
            'utf8'
        );

        // Return success response
        res.json({
            success: true,
            message: 'User added successfully',
            user: newUser
        });

    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Helper function to generate TOTP secret
function generateTOTPSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
}

module.exports = router; 