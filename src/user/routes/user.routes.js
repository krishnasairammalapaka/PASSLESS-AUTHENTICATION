const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const path = require('path');

// User dashboard routes
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

// User TOTP verification
router.get('/verify-totp', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/verify-totp.html'));
});

router.post('/verify-totp', userController.verifyTOTP);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

module.exports = router; 