import SecureWebSocket from '../websocket/SecureWebSocket';

// Admin connection example
const adminWs = new SecureWebSocket('wss://your-server/ws', {
  maxReconnectAttempts: 5,
  reconnectDelay: 5000
});

adminWs.on('connection', (data) => {
  console.log('Connected with ID:', data.clientId);
  
  // Authenticate as admin
  adminWs.send('auth', {
    userType: 'admin',
    userId: 'admin@example.com',
    token: 'your-auth-token'
  });
});

adminWs.on('message', (data) => {
  console.log('Received message:', data);
});

adminWs.on('error', (data) => {
  console.error('WebSocket error:', data.message);
});

// User connection example
const userWs = new SecureWebSocket('wss://your-server/ws');

userWs.on('connection', (data) => {
  console.log('Connected with ID:', data.clientId);
  
  // Authenticate as user
  userWs.send('auth', {
    userType: 'user',
    userId: 'user@example.com',
    token: 'user-auth-token'
  });
});

// Send message to admin
userWs.send('message', {
  content: 'Hello admin, I need help!',
  recipient: 'admin',
  recipientId: 'admin@example.com'
}); 