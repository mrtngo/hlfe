'use client';

import { POLYMARKET_WS } from '@/lib/constants/polymarket';

const isDev = process.env.NODE_ENV === 'development';
const log = {
    info: (...args: any[]) => isDev && console.log(...args),
    warn: (...args: any[]) => isDev && console.warn(...args),
    error: (...args: any[]) => isDev && console.error(...args),
};

export interface PolymarketWsCallbacks {
    onPriceUpdate?: (tokenId: string, price: number) => void;
    onBookUpdate?: (tokenId: string, bids: any[], asks: any[]) => void;
    onTradeUpdate?: (tokenId: string, trade: any) => void;
    onConnect?: () => void;
    onError?: (error: Error) => void;
}

class PolymarketWebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private callbacks: PolymarketWsCallbacks = {};
    private isConnecting = false;
    private subscribedTokens: Set<string> = new Set();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    connect(callbacks: PolymarketWsCallbacks) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            log.info('📡 WebSocket already connected');
            this.callbacks = { ...this.callbacks, ...callbacks };
            return;
        }

        if (this.isConnecting) return;

        this.callbacks = { ...this.callbacks, ...callbacks };
        this.isConnecting = true;
        this.reconnectAttempts = 0;
        this.establishConnection();
    }

    private establishConnection() {
        try {
            log.info('📡 Connecting to Polymarket WebSocket');
            this.ws = new WebSocket(POLYMARKET_WS.MARKET);

            this.ws.onopen = () => {
                log.info('✅ Polymarket WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.resubscribeAll();
                this.callbacks.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                // Ignore non-JSON text responses (PONG, INVALID OPERATION, etc.)
                if (typeof event.data === 'string' && !event.data.startsWith('{') && !event.data.startsWith('[')) return;

                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (err) {
                    log.warn('⚠️ Polymarket WS non-JSON message:', event.data);
                }
            };

            this.ws.onerror = (error) => {
                log.error('❌ Polymarket WS error:', error);
                this.callbacks.onError?.(new Error('Polymarket WebSocket error'));
            };

            this.ws.onclose = () => {
                log.info('🔌 Polymarket WebSocket closed');
                this.stopHeartbeat();
                this.attemptReconnect();
            };
        } catch (error) {
            log.error('❌ Failed to create Polymarket WebSocket:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    private handleMessage(data: any) {
        // Handle different message types from Polymarket
        if (Array.isArray(data)) {
            for (const msg of data) {
                this.processMessage(msg);
            }
        } else {
            this.processMessage(data);
        }
    }

    private processMessage(msg: any) {
        const eventType = msg.event_type || msg.type;
        const assetId = msg.asset_id || msg.token_id;

        switch (eventType) {
            case 'book':
                if (assetId && msg.bids && msg.asks) {
                    this.callbacks.onBookUpdate?.(assetId, msg.bids, msg.asks);
                }
                // Extract best bid/ask for price update — only if spread is tight
                if (assetId && msg.bids?.length && msg.asks?.length) {
                    // Find actual best bid (highest) and best ask (lowest)
                    const bestBid = Math.max(...msg.bids.map((b: any) => parseFloat(b.price || '0')));
                    const bestAsk = Math.min(...msg.asks.map((a: any) => parseFloat(a.price || '1')));
                    const spread = bestAsk - bestBid;
                    // Only use book mid when spread < 20% — otherwise it's meaningless
                    if (spread > 0 && spread < 0.20) {
                        const mid = (bestBid + bestAsk) / 2;
                        this.callbacks.onPriceUpdate?.(assetId, mid);
                    }
                }
                break;

            case 'price_change':
            case 'last_trade_price':
                if (assetId && msg.price) {
                    this.callbacks.onPriceUpdate?.(assetId, parseFloat(msg.price));
                }
                break;

            case 'trade':
                if (assetId) {
                    this.callbacks.onTradeUpdate?.(assetId, msg);
                    if (msg.price) {
                        this.callbacks.onPriceUpdate?.(assetId, parseFloat(msg.price));
                    }
                }
                break;
        }
    }

    subscribeToMarket(tokenIds: string[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (tokenIds.length === 0) return;

        // Track subscribed tokens
        for (const id of tokenIds) {
            this.subscribedTokens.add(id);
        }

        this.ws.send(JSON.stringify({
            assets_ids: tokenIds,
            type: 'market',
            custom_feature_enabled: true,
        }));

        log.info(`📊 Subscribed to ${tokenIds.length} Polymarket tokens`);
    }

    unsubscribeFromMarket(tokenIds: string[]) {
        for (const id of tokenIds) {
            this.subscribedTokens.delete(id);
        }
        // Polymarket WS doesn't have explicit unsubscribe - disconnect/reconnect if needed
    }

    private resubscribeAll() {
        if (this.subscribedTokens.size > 0) {
            this.subscribeToMarket(Array.from(this.subscribedTokens));
        }
    }

    private startHeartbeat() {
        // Polymarket requires PING every 10 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('PING');
            }
        }, 10000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.error('❌ Max Polymarket reconnection attempts reached');
            this.callbacks.onError?.(new Error('Failed to reconnect Polymarket WebSocket'));
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        log.info(`🔄 Polymarket reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

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
        this.subscribedTokens.clear();
        this.isConnecting = false;
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const polymarketWsManager = new PolymarketWebSocketManager();
