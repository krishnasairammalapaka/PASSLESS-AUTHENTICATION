const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const path = require('path');

// Admin dashboard routes
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

// Admin TOTP verification
router.get('/verify-totp', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/verify-totp.html'));
});

router.post('/verify-totp', adminController.verifyTOTP);

// Admin management routes
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Admin settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router; 