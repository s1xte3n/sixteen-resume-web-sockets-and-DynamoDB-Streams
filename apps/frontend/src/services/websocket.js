class WebSocketService {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    /**
     * Connect to WebsSocket server
     */
    connect() {
        if (this.ws?.readyState === WebSocketService.OPEN) {
            console.log('Already connected');
            return;
        }

        console.log(`Connecting to ${this.url}...`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('✅ Connected to WebSocket');
            this.reconnectAttempts = 0;
            this.emit('open');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Message received', data);
                this.emit('message', data);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = (event) => {
            console.log('🔌 Disconnected from WebSocket', event.code, event.reason);
            this.emit('close');
            this.reconnect();
        };
    }
    /**
     * Reconnect with exponential backoff
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectionAttempts');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

        setTimeout(() => this.connect(), delay);
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    /**
     * Emit event to listeners
     */
    emit (event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export default WebSocketService;
