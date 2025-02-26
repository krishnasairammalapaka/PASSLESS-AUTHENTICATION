const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const fileUtils = require('../utils/file.utils');
const config = require('../config/config');

// Move all the authentication logic from server.js here
// Export the functions: login, generateTOTP, verifySetup, verify

module.exports = {
    login,
    generateTOTP,
    verifySetup,
    verify
}; 