const fileUtils = require('../../utils/file.utils');
const totpUtils = require('../../utils/totp.utils');

async function verifyTOTP(req, res) {
    const { username: email, code } = req.body;
    
    try {
        const users = await fileUtils.readJSONFile('users');
        const user = users.users.find(u => u.email === email);
        
        if (!user || !user.verified) {
            return res.json({ 
                success: false, 
                message: 'User not found or not verified' 
            });
        }
        
        const verified = totpUtils.verifyTOTP(user.secret, code);
        
        res.json({
            success: verified,
            role: 'user'
        });
    } catch (error) {
        console.error('User verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying code' 
        });
    }
}

async function getProfile(req, res) {
    // Implement get profile logic
    res.json({ message: 'Get profile not implemented' });
}

async function updateProfile(req, res) {
    // Implement update profile logic
    res.json({ message: 'Update profile not implemented' });
}

module.exports = {
    verifyTOTP,
    getProfile,
    updateProfile
}; 