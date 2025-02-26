const totpUtils = require('../../utils/totp.utils');
const fileUtils = require('../../utils/file.utils');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

async function login(req, res) {
    const { username: email } = req.body;
    
    try {
        const users = await fileUtils.readJSONFile('users');
        const admins = await fileUtils.readJSONFile('admins');
        
        const user = users?.users.find(u => u.email === email);
        const admin = admins?.admins.find(a => a.email === email);
        
        const foundUser = user || admin;
        
        if (!foundUser) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            isNewUser: !foundUser.verified,
            role: foundUser.role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
}

async function generateTOTP(req, res) {
    const { username: email } = req.query;
    
    try {
        // Check if user exists in either users or admins
        const users = await fileUtils.readJSONFile('users');
        const admins = await fileUtils.readJSONFile('admins');
        
        const user = users?.users.find(u => u.email === email);
        const admin = admins?.admins.find(a => a.email === email);
        
        const foundUser = user || admin;
        
        if (!foundUser) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Use existing secret if available, otherwise generate new one
        let secret = foundUser.secret;
        if (!secret) {
            const { base32: newSecret } = speakeasy.generateSecret();
            secret = newSecret;
            
            // Save the new secret
            if (user) {
                const userIndex = users.users.findIndex(u => u.email === email);
                users.users[userIndex].secret = secret;
                await fileUtils.writeJSONFile('users', users);
            } else {
                const adminIndex = admins.admins.findIndex(a => a.email === email);
                admins.admins[adminIndex].secret = secret;
                await fileUtils.writeJSONFile('admins', admins);
            }
        }

        // Generate QR code
        const otpauthUrl = `otpauth://totp/YourApp:${email}?secret=${secret}&issuer=YourApp`;
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        
        res.json({
            success: true,
            qrCodeUrl,
            secret
        });
    } catch (error) {
        console.error('TOTP generation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error generating TOTP' 
        });
    }
}

async function verifySetup(req, res) {
    const { username: email, code } = req.body;
    
    try {
        const users = await fileUtils.readJSONFile('users');
        const admins = await fileUtils.readJSONFile('admins');
        
        const user = users?.users.find(u => u.email === email);
        const admin = admins?.admins.find(a => a.email === email);
        
        const foundUser = user || admin;
        
        if (!foundUser) {
            return res.json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const verified = speakeasy.totp.verify({
            secret: foundUser.secret,
            encoding: 'base32',
            token: code,
            window: 1 // Allow 30 seconds of time drift
        });
        
        if (verified) {
            foundUser.verified = true;
            if (user) {
                const userIndex = users.users.findIndex(u => u.email === email);
                users.users[userIndex] = foundUser;
                await fileUtils.writeJSONFile('users', users);
            } else {
                const adminIndex = admins.admins.findIndex(a => a.email === email);
                admins.admins[adminIndex] = foundUser;
                await fileUtils.writeJSONFile('admins', admins);
            }
        }
        
        res.json({
            success: verified,
            role: verified ? foundUser.role : null,
            message: verified ? 'Verification successful' : 'Invalid verification code'
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying code' 
        });
    }
}

async function verifyTOTP(req, res) {
    const { username: email, code } = req.body;
    
    try {
        const users = await fileUtils.readJSONFile('users');
        const admins = await fileUtils.readJSONFile('admins');
        
        const user = users?.users.find(u => u.email === email);
        const admin = admins?.admins.find(a => a.email === email);
        
        const foundUser = user || admin;
        
        if (!foundUser || !foundUser.verified) {
            return res.json({ 
                success: false, 
                message: 'User not found or not verified' 
            });
        }
        
        const verified = totpUtils.verifyTOTP(foundUser.secret, code);
        
        res.json({
            success: verified,
            role: verified ? foundUser.role : null
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error verifying code' 
        });
    }
}

module.exports = {
    login,
    generateTOTP,
    verifySetup,
    verifyTOTP
}; 