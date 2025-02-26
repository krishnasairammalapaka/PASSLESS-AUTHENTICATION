const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const path = require('path');

// Login route
router.post('/login', authController.login);

// TOTP setup and verification
router.get('/generate-totp', authController.generateTOTP);
router.post('/verify-setup', authController.verifySetup);
router.post('/verify', authController.verifyTOTP);

// Serve auth pages
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/setup-totp', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/setup-totp.html'));
});

// Add this route for verify-totp page
router.get('/verify-totp', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/verify-totp.html'));
});

module.exports = router; 