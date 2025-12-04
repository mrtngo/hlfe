'use client';

import { useState, useCallback } from 'react';

export interface QueuedOrder {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    size: number;
    price?: number;
    leverage?: number;
    reduceOnly?: boolean;
    timestamp: number;
}

export function useTransactionQueue() {
    const [queuedOrders, setQueuedOrders] = useState<QueuedOrder[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const addToQueue = useCallback((order: Omit<QueuedOrder, 'id' | 'timestamp'>) => {
        const queuedOrder: QueuedOrder = {
            ...order,
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
        };
        setQueuedOrders(prev => [...prev, queuedOrder]);
        return queuedOrder.id;
    }, []);

    const removeFromQueue = useCallback((id: string) => {
        setQueuedOrders(prev => prev.filter(o => o.id !== id));
    }, []);

    const clearQueue = useCallback(() => {
        setQueuedOrders([]);
    }, []);

    return {
        queuedOrders,
        addToQueue,
        removeFromQueue,
        clearQueue,
        isProcessing,
        setIsProcessing,
        queueLength: queuedOrders.length,
    };
}




