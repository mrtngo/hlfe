'use client';

import { WS_URL, IS_TESTNET } from './client';

export interface WebSocketCallbacks {
    onPriceUpdate?: (coin: string, price: number) => void;
    onAccountUpdate?: (data: any) => void;
    onPositionUpdate?: (positions: any[]) => void;
    onOrderUpdate?: (orders: any[]) => void;
    onUserEvent?: (event: any) => void;
    onError?: (error: Error) => void;
}

class HyperliquidWebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private callbacks: WebSocketCallbacks = {};
    private isConnecting = false;
    private subscriptions: Set<string> = new Set();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    connect(callbacks: WebSocketCallbacks) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('📡 WebSocket already connected');
            this.callbacks = { ...this.callbacks, ...callbacks };
            return;
        }

        if (this.isConnecting) {
            console.log('📡 WebSocket connection in progress...');
            return;
        }

        this.callbacks = { ...this.callbacks, ...callbacks };
        this.isConnecting = true;
        this.reconnectAttempts = 0;

        this.establishConnection();
    }

    private establishConnection() {
        try {
            console.log('📡 Connecting to Hyperliquid WebSocket:', WS_URL);
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.resubscribeAll();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error('❌ WebSocket message parse error:', err);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.callbacks.onError?.(new Error('WebSocket connection error'));
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket closed');
                this.stopHeartbeat();
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    private handleMessage(data: any) {
        // Handle allMids (price updates)
        if (data.channel === 'allMids' && data.data?.mids) {
            const mids = data.data.mids;
            Object.entries(mids).forEach(([coin, price]) => {
                this.callbacks.onPriceUpdate?.(coin, parseFloat(price as string));
            });
            return;
        }

        // Handle user data updates (WebData2)
        if (data.channel === 'webData2' && data.data) {
            this.callbacks.onAccountUpdate?.(data.data);
            
            // Extract positions if available
            if (data.data.assetPositions) {
                this.callbacks.onPositionUpdate?.(data.data.assetPositions);
            }
            return;
        }

        // Handle user events
        if (data.channel === 'userEvents' && data.data) {
            this.callbacks.onUserEvent?.(data.data);
            return;
        }

        // Handle order updates
        if (data.channel === 'orderUpdates' && data.data) {
            this.callbacks.onOrderUpdate?.(data.data);
            return;
        }
    }

    subscribeToPrices() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket not ready for price subscription');
            return;
        }

        if (this.subscriptions.has('allMids')) {
            return; // Already subscribed
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: {
                type: 'allMids'
            }
        }));

        this.subscriptions.add('allMids');
        console.log('📊 Subscribed to price updates');
    }

    subscribeToUserData(user: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket not ready for user data subscription');
            return;
        }

        const subscriptionKey = `webData2:${user}`;
        if (this.subscriptions.has(subscriptionKey)) {
            return; // Already subscribed
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: {
                type: 'webData2',
                user: user.toLowerCase()
            }
        }));

        this.subscriptions.add(subscriptionKey);
        console.log('👤 Subscribed to user data updates for:', user);
    }

    subscribeToUserEvents(user: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket not ready for user events subscription');
            return;
        }

        const subscriptionKey = `userEvents:${user}`;
        if (this.subscriptions.has(subscriptionKey)) {
            return; // Already subscribed
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: {
                type: 'userEvents',
                user: user.toLowerCase()
            }
        }));

        this.subscriptions.add(subscriptionKey);
        console.log('📢 Subscribed to user events for:', user);
    }

    private resubscribeAll() {
        // Resubscribe to prices
        if (this.subscriptions.has('allMids')) {
            this.subscribeToPrices();
        }

        // Resubscribe to user data (need to track users)
        this.subscriptions.forEach(sub => {
            if (sub.startsWith('webData2:')) {
                const user = sub.replace('webData2:', '');
                this.subscribeToUserData(user);
            } else if (sub.startsWith('userEvents:')) {
                const user = sub.replace('userEvents:', '');
                this.subscribeToUserEvents(user);
            }
        });
    }

    private startHeartbeat() {
        // Send ping every 30 seconds to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ method: 'ping' }));
            }
        }, 30000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.callbacks.onError?.(new Error('Failed to reconnect WebSocket'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.isConnecting = false;
            this.establishConnection();
        }, delay);
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.isConnecting = false;
        console.log('🔌 WebSocket disconnected');
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const wsManager = new HyperliquidWebSocketManager();

