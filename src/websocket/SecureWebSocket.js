class SecureWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 5000;
    
    this.connect();
  }

  connect() {
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => this.handleOpen(resolve);
        this.socket.onmessage = (event) => this.handleMessage(event);
        this.socket.onclose = () => this.handleClose();
        this.socket.onerror = (error) => this.handleError(error, reject);
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  handleOpen(resolve) {
    this.reconnectAttempts = 0;
    resolve();
  }

  handleMessage(event) {
    try {
      const decrypted = this.decrypt(event.data);
      const data = JSON.parse(decrypted);
      
      const handler = this.messageHandlers.get(data.type);
      if (handler) {
        handler(data);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  handleClose() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  handleError(error, reject) {
    console.error('WebSocket error:', error);
    reject(error);
  }

  encrypt(data) {
    // Implementation using your preferred encryption method
    return JSON.stringify(data); // Replace with actual encryption
  }

  decrypt(message) {
    // Implementation using your preferred decryption method
    return message; // Replace with actual decryption
  }

  send(type, data) {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message = {
      type,
      ...data,
      timestamp: new Date().toISOString()
    };

    this.socket.send(this.encrypt(message));
  }

  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export default SecureWebSocket; 