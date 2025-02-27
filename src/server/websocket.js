const WebSocket = require('ws');
const crypto = require('crypto');

class ChatServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Store client connections
        this.chatHistory = new Map(); // Store chat history
        this.initialize();
    }

    initialize() {
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const isAdmin = req.url.includes('/ws/admin');
            
            // Store client info
            this.clients.set(clientId, {
                ws,
                isAdmin,
                userId: null
            });

            console.log(`Client connected: ${clientId} (${isAdmin ? 'Admin' : 'User'})`);

            // Send initial active users list to admin
            if (isAdmin) {
                this.sendActiveUsersList(ws);
            }

            ws.on('message', (message) => {
                try {
                    const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
                    this.handleMessage(clientId, parsedMessage);
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            ws.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
                this.broadcastActiveUsers();
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });
    }

    generateClientId() {
        return crypto.randomUUID();
    }

    handleMessage(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            // Parse message if it's a string
            const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;

            switch (parsedMessage.type) {
                case 'auth':
                    this.handleAuth(clientId, parsedMessage.data);
                    break;
                case 'chat':
                    this.handleChat(clientId, parsedMessage.data);
                    break;
                case 'getChatHistory':
                    const history = this.getChatHistory(client.userId, parsedMessage.data.userId);
                    client.ws.send(JSON.stringify({
                        type: 'chatHistory',
                        data: { history, userId: parsedMessage.data.userId }
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleAuth(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.userId = data.userId;
        client.email = data.email;
        
        this.broadcastActiveUsers();
    }

    handleChat(clientId, data) {
        const sender = this.clients.get(clientId);
        if (!sender) return;

        const messageData = {
            content: data.content,
            senderId: sender.userId || clientId,
            senderEmail: sender.email,
            senderType: sender.isAdmin ? 'admin' : 'user',
            recipientId: data.recipientId,
            timestamp: new Date().toISOString()
        };

        // Store in chat history using both sender and recipient IDs
        if (sender.isAdmin) {
            this.storeChatMessage(sender.email, data.recipientId, messageData);
        } else {
            this.storeChatMessage(data.recipientId, sender.email, messageData);
        }

        // Create message object
        const message = {
            type: 'chat',
            data: messageData
        };

        // Send message based on sender type
        if (sender.isAdmin) {
            // Send to specific user
            this.sendToUser(data.recipientId, message);
        } else {
            // Send to all admins
            this.broadcastToAdmins(message);
        }

        // Send confirmation to sender
        sender.ws.send(JSON.stringify({
            type: 'status',
            data: {
                status: 'sent',
                messageId: messageData.timestamp,
                recipientId: data.recipientId
            }
        }));
    }

    broadcastToAdmins(message) {
        for (const [_, client] of this.clients) {
            if (client.isAdmin) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }

    sendToUser(userId, message) {
        for (const [_, client] of this.clients) {
            if (client.userId === userId) {
                client.ws.send(JSON.stringify(message));
                break; // Found the specific user, no need to continue
            }
        }
    }

    broadcastActiveUsers() {
        const activeUsers = Array.from(this.clients.values())
            .filter(client => !client.isAdmin && client.userId)
            .map(client => ({
                userId: client.userId,
                email: client.email,
                online: true
            }));

        const message = {
            type: 'activeUsers',
            data: activeUsers
        };

        // Send active users list to all admins
        for (const [_, client] of this.clients) {
            if (client.isAdmin) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }

    sendActiveUsersList(ws) {
        const activeUsers = Array.from(this.clients.values())
            .filter(client => !client.isAdmin && client.userId)
            .map(client => ({
                userId: client.userId,
                email: client.email,
                online: true
            }));

        ws.send(JSON.stringify({
            type: 'activeUsers',
            data: activeUsers
        }));
    }

    storeChatMessage(senderId, recipientId, message) {
        const chatId = [senderId, recipientId].sort().join('-');
        if (!this.chatHistory.has(chatId)) {
            this.chatHistory.set(chatId, []);
        }
        this.chatHistory.get(chatId).push({
            ...message,
            timestamp: new Date().toISOString()
        });
    }

    getChatHistory(userId1, userId2) {
        // Try both combinations of the chat ID
        const chatId1 = [userId1, userId2].sort().join('-');
        const chatId2 = [userId2, userId1].sort().join('-');
        
        const history1 = this.chatHistory.get(chatId1) || [];
        const history2 = this.chatHistory.get(chatId2) || [];
        
        // Combine and sort by timestamp
        return [...history1, ...history2].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
    }
}

module.exports = ChatServer; 