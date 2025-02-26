const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const path = require('path');

router.post('/login', authService.login);
router.get('/generate-totp', authService.generateTOTP);
router.post('/verify-setup', authService.verifySetup);
router.post('/verify', authService.verify);

router.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/auth/setup-totp.html'));
});

router.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/auth/verify-totp.html'));
});

module.exports = router; 