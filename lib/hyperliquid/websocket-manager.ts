'use client';

import { WS_URL, IS_TESTNET } from './client';

// Conditional logging - only in development
const isDev = process.env.NODE_ENV === 'development';
const log = {
    info: (...args: any[]) => isDev && console.log(...args),
    warn: (...args: any[]) => isDev && console.warn(...args),
    error: (...args: any[]) => console.error(...args), // Always log errors
};

export interface WebSocketCallbacks {
    onPriceUpdate?: (coin: string, price: number) => void;
    onAccountUpdate?: (data: any) => void;
    onPositionUpdate?: (positions: any[]) => void;
    onOrderUpdate?: (orders: any[]) => void;
    onUserEvent?: (event: any) => void;
    onCandleUpdate?: (coin: string, interval: string, candle: any) => void;
    onAssetCtxUpdate?: (coin: string, ctx: any) => void;
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
            log.info('📡 WebSocket already connected');
            this.callbacks = { ...this.callbacks, ...callbacks };
            return;
        }

        if (this.isConnecting) {
            log.info('📡 WebSocket connection in progress...');
            return;
        }

        this.callbacks = { ...this.callbacks, ...callbacks };
        this.isConnecting = true;
        this.reconnectAttempts = 0;

        this.establishConnection();
    }

    private establishConnection() {
        try {
            log.info('📡 Connecting to Hyperliquid WebSocket:', WS_URL);
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                log.info('✅ WebSocket connected');
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
                    log.error('❌ WebSocket message parse error:', err, event.data);
                }
            };

            this.ws.onerror = (error) => {
                log.error('❌ WebSocket error:', error);
                this.callbacks.onError?.(new Error('WebSocket connection error'));
            };

            this.ws.onclose = () => {
                log.info('🔌 WebSocket closed');
                this.stopHeartbeat();
                this.attemptReconnect();
            };
        } catch (error) {
            log.error('❌ Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    private handleMessage(data: any) {
        // Handle error messages
        if (data.channel === 'error') {
            const errorMsg = data.data;
            // Ignore "Already unsubscribed" errors - these are harmless race conditions
            if (typeof errorMsg === 'string' && errorMsg.includes('Already unsubscribed')) {
                // Silently ignore
            } else {
                log.error('❌ WebSocket error:', errorMsg);
            }
            // Don't return - let other handlers process if needed
        }
        
        // Handle allMids (price updates)
        if (data.channel === 'allMids' && data.data?.mids) {
            const mids = data.data.mids;
            Object.entries(mids).forEach(([coin, price]) => {
                this.callbacks.onPriceUpdate?.(coin, parseFloat(price as string));
            });
            return;
        }

        // Handle user data updates (WebData3 - newer version)
        if (data.channel === 'webData3' && data.data) {
            this.callbacks.onAccountUpdate?.(data.data);
            return;
        }

        // Handle clearinghouse state (positions and margin)
        if (data.channel === 'clearinghouseState' && data.data) {
            this.callbacks.onAccountUpdate?.(data.data);
            
            // Extract positions if available
            if (data.data.assetPositions) {
                this.callbacks.onPositionUpdate?.(data.data.assetPositions);
            }
            return;
        }

        // Handle candle updates
        if (data.channel === 'candle' && data.data) {
            const candleData = data.data;
            
            if (Array.isArray(candleData) && candleData.length > 0) {
                const firstCandle = candleData[0];
                const coin = firstCandle.s || firstCandle.coin;
                const interval = firstCandle.i || firstCandle.interval;
                
                if (coin && interval) {
                    this.callbacks.onCandleUpdate?.(coin, interval, candleData);
                }
            } else if (candleData && typeof candleData === 'object') {
                if (candleData.coin && candleData.interval) {
                    const candles = Array.isArray(candleData.candles) 
                        ? candleData.candles 
                        : [candleData];
                    this.callbacks.onCandleUpdate?.(candleData.coin, candleData.interval, candles);
                }
            }
            return;
        }

        // Handle active asset context updates (funding, mark price, etc.)
        if (data.channel === 'activeAssetCtx' && data.data) {
            const assetCtx = data.data;
            if (assetCtx.coin && assetCtx.ctx) {
                this.callbacks.onAssetCtxUpdate?.(assetCtx.coin, assetCtx.ctx);
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

        // Handle openOrders
        if (data.channel === 'openOrders' && data.data) {
            if (data.data.orders && Array.isArray(data.data.orders)) {
                this.callbacks.onOrderUpdate?.(data.data.orders);
            }
            return;
        }
    }

    subscribeToPrices() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        if (this.subscriptions.has('allMids')) {
            return;
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' }
        }));

        this.subscriptions.add('allMids');
        log.info('📊 Subscribed to price updates');
    }

    subscribeToUserData(user: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const normalizedUser = user.toLowerCase();
        
        // Subscribe to webData3 (newer version)
        const webDataKey = `webData3:${normalizedUser}`;
        if (!this.subscriptions.has(webDataKey)) {
            this.ws.send(JSON.stringify({
                method: 'subscribe',
                subscription: { type: 'webData3', user: normalizedUser }
            }));
            this.subscriptions.add(webDataKey);
        }

        // Subscribe to clearinghouseState (positions and margin)
        const clearinghouseKey = `clearinghouseState:${normalizedUser}`;
        if (!this.subscriptions.has(clearinghouseKey)) {
            this.ws.send(JSON.stringify({
                method: 'subscribe',
                subscription: { type: 'clearinghouseState', user: normalizedUser }
            }));
            this.subscriptions.add(clearinghouseKey);
        }

        // Subscribe to openOrders
        const openOrdersKey = `openOrders:${normalizedUser}`;
        if (!this.subscriptions.has(openOrdersKey)) {
            this.ws.send(JSON.stringify({
                method: 'subscribe',
                subscription: { type: 'openOrders', user: normalizedUser }
            }));
            this.subscriptions.add(openOrdersKey);
        }
    }

    subscribeToUserEvents(user: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const subscriptionKey = `userEvents:${user}`;
        if (this.subscriptions.has(subscriptionKey)) {
            return;
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'userEvents', user: user.toLowerCase() }
        }));

        this.subscriptions.add(subscriptionKey);
    }

    subscribeToCandles(coin: string, interval: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const subscriptionKey = `candle:${coin}|${interval}`;
        if (this.subscriptions.has(subscriptionKey)) {
            return;
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'candle', coin, interval }
        }));

        this.subscriptions.add(subscriptionKey);
    }

    unsubscribeFromCandles(coin: string, interval: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        
        const subscriptionKey = `candle:${coin}|${interval}`;
        if (!this.subscriptions.has(subscriptionKey)) {
            return;
        }

        try {
            this.ws.send(JSON.stringify({
                method: 'unsubscribe',
                subscription: { type: 'candle', coin, interval }
            }));
            this.subscriptions.delete(subscriptionKey);
        } catch (error) {
            this.subscriptions.delete(subscriptionKey);
        }
    }

    subscribeToAssetCtx(coin: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const subscriptionKey = `activeAssetCtx:${coin}`;
        if (this.subscriptions.has(subscriptionKey)) {
            return;
        }

        this.ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'activeAssetCtx', coin }
        }));

        this.subscriptions.add(subscriptionKey);
    }

    unsubscribeFromAssetCtx(coin: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const subscriptionKey = `activeAssetCtx:${coin}`;
        if (!this.subscriptions.has(subscriptionKey)) return;

        this.ws.send(JSON.stringify({
            method: 'unsubscribe',
            subscription: { type: 'activeAssetCtx', coin }
        }));

        this.subscriptions.delete(subscriptionKey);
    }

    private resubscribeAll() {
        // Resubscribe to prices
        if (this.subscriptions.has('allMids')) {
            this.subscribeToPrices();
        }

        // Resubscribe to user data (need to track users)
        this.subscriptions.forEach(sub => {
            if (sub.startsWith('webData3:') || sub.startsWith('clearinghouseState:') || sub.startsWith('openOrders:')) {
                const user = sub.split(':')[1];
                this.subscribeToUserData(user);
            } else if (sub.startsWith('userEvents:')) {
                const user = sub.replace('userEvents:', '');
                this.subscribeToUserEvents(user);
            } else if (sub.startsWith('candle:')) {
                const [coin, interval] = sub.replace('candle:', '').split('|');
                this.subscribeToCandles(coin, interval);
            } else if (sub.startsWith('activeAssetCtx:')) {
                const coin = sub.replace('activeAssetCtx:', '');
                this.subscribeToAssetCtx(coin);
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
            log.error('❌ Max reconnection attempts reached');
            this.callbacks.onError?.(new Error('Failed to reconnect WebSocket'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        log.info(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

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
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const wsManager = new HyperliquidWebSocketManager();

