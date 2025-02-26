const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/user-dashboard.html'));
});

router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard/admin-dashboard.html'));
});

module.exports = router; 