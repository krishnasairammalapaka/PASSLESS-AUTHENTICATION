const WebSocket = require('ws');
const crypto = require('crypto');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();

        this.wss.on('connection', (ws, req) => {
            const clientId = crypto.randomUUID();
            this.clients.set(clientId, ws);
            
            console.log(`Client connected: ${clientId}`);
            
            ws.on('message', (message) => {
                this.handleMessage(clientId, message);
            });
            
            ws.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });
            
            // Send initial connection success message
            ws.send(JSON.stringify({
                type: 'connection',
                status: 'success',
                clientId: clientId
            }));
        });
    }

    broadcast(message) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    handleMessage(clientId, message) {
        try {
            const data = JSON.parse(message);
            const ws = this.clients.get(clientId);
            
            if (!ws) return;

            switch(data.type) {
                case 'getUserData':
                    this.handleGetUserData(ws);
                    break;
                case 'userUpdate':
                    this.broadcast({
                        type: 'userUpdate',
                        data: data.data
                    });
                    break;
                case 'heartbeat':
                    ws.send(JSON.stringify({
                        type: 'heartbeat',
                        timestamp: Date.now()
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    async handleGetUserData(ws) {
        try {
            // This would be replaced with your actual user data fetching logic
            ws.send(JSON.stringify({
                type: 'userData',
                data: {
                    // Your user data here
                }
            }));
        } catch (error) {
            console.error('Error getting user data:', error);
        }
    }
}

module.exports = WebSocketServer; 