const websocketConfig = {
  port: process.env.WS_PORT || 8080,
  heartbeatInterval: 30000, // 30 seconds
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },
  reconnect: {
    maxAttempts: 5,
    delay: 5000
  }
};

module.exports = websocketConfig; 