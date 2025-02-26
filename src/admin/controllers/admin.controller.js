const fileUtils = require('../../utils/file.utils');
const totpUtils = require('../../utils/totp.utils');

async function verifyTOTP(req, res) {
    const { username: email, code } = req.body;
    
    try {
        const admins = await fileUtils.readJSONFile('admins');
        const admin = admins.admins.find(a => a.email === email);
        
        if (!admin || !admin.verified) {
            return res.json({ 
                success: false, 
                message: 'Admin not found or not verified' 
            });
        }
        
        const verified = totpUtils.verifyTOTP(admin.secret, code);
        
        res.json({
            success: verified,
            role: admin.role
        });
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying code' 
        });
    }
}

async function listUsers(req, res) {
    try {
        const users = await fileUtils.readJSONFile('users');
        res.json(users.users);
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ message: 'Error listing users' });
    }
}

async function getUser(req, res) {
    // Implement get user logic
    res.json({ message: 'Get user not implemented' });
}

async function updateUser(req, res) {
    // Implement update user logic
    res.json({ message: 'Update user not implemented' });
}

async function deleteUser(req, res) {
    // Implement delete user logic
    res.json({ message: 'Delete user not implemented' });
}

async function getSettings(req, res) {
    // Implement get settings logic
    res.json({ message: 'Get settings not implemented' });
}

async function updateSettings(req, res) {
    // Implement update settings logic
    res.json({ message: 'Update settings not implemented' });
}

module.exports = {
    verifyTOTP,
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    getSettings,
    updateSettings
}; 