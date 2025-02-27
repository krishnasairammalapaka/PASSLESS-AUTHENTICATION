const WebSocket = require('ws');
const crypto = require('crypto');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Store client connections
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      this.clients.set(clientId, { ws, type: 'unknown' });

      ws.on('message', (message) => this.handleMessage(clientId, message));
      ws.on('close', () => this.handleClose(clientId));
      ws.on('error', (error) => this.handleError(clientId, error));

      // Send initial connection success message
      this.sendEncrypted(ws, {
        type: 'connection',
        status: 'success',
        clientId
      });
    });
  }

  handleMessage(clientId, message) {
    try {
      const decrypted = this.decrypt(message);
      const data = JSON.parse(decrypted);

      switch (data.type) {
        case 'auth':
          this.handleAuth(clientId, data);
          break;
        case 'message':
          this.broadcastMessage(clientId, data);
          break;
        case 'userConnected':
          this.handleUserConnected(clientId, data);
          break;
        default:
          this.sendError(clientId, 'Unknown message type');
      }
    } catch (error) {
      this.sendError(clientId, 'Message processing failed');
    }
  }

  handleAuth(clientId, data) {
    const client = this.clients.get(clientId);
    if (client) {
      client.type = data.userType; // 'admin' or 'user'
      client.userId = data.userId;
      this.sendEncrypted(client.ws, {
        type: 'auth',
        status: 'success'
      });
    }
  }

  broadcastMessage(senderId, data) {
    const sender = this.clients.get(senderId);
    if (!sender) return;

    this.clients.forEach((client, clientId) => {
      if (clientId !== senderId && this.shouldReceiveMessage(client, data)) {
        this.sendEncrypted(client.ws, {
          type: 'message',
          content: data.content,
          senderId: sender.userId || senderId,
          senderType: sender.type,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  shouldReceiveMessage(client, data) {
    if (data.recipient === 'all') return true;
    if (data.recipientId && data.recipientId === client.userId) return true;
    return false;
  }

  handleClose(clientId) {
    this.clients.delete(clientId);
  }

  handleError(clientId, error) {
    console.error(`Client ${clientId} error:`, error);
    this.sendError(clientId, 'WebSocket error occurred');
  }

  sendError(clientId, message) {
    const client = this.clients.get(clientId);
    if (client) {
      this.sendEncrypted(client.ws, {
        type: 'error',
        message
      });
    }
  }

  handleUserConnected(clientId, data) {
    const client = this.clients.get(clientId);
    if (client) {
      client.userId = data.userId;
      
      // Notify admins of new user connection
      this.clients.forEach((adminClient, adminClientId) => {
        if (adminClient.type === 'admin') {
          this.sendEncrypted(adminClient.ws, {
            type: 'userConnected',
            userId: data.userId,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  // Encryption/Decryption methods
  encrypt(data) {
    // Implementation using your preferred encryption method
    return JSON.stringify(data); // Replace with actual encryption
  }

  decrypt(message) {
    // Implementation using your preferred decryption method
    return message.toString(); // Replace with actual decryption
  }

  sendEncrypted(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(this.encrypt(data));
    }
  }
}

module.exports = WebSocketServer; 