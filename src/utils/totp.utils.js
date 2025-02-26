const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

async function generateTOTP(email, appName) {
    const secret = speakeasy.generateSecret();
    const otpauthUrl = `otpauth://totp/${appName}:${email}?secret=${secret.base32}&issuer=${appName}`;
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    
    return {
        secret: secret.base32,
        qrCodeUrl
    };
}

function verifyTOTP(secret, token) {
    try {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 30 seconds of time drift
        });
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
}

module.exports = {
    generateTOTP,
    verifyTOTP
}; 