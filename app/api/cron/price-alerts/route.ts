/**
 * Price Alerts Cron API Route
 * Runs on Vercel cron to check prices and send push notifications to all subscribers
 */

import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { supabase } from '@/lib/supabase/client';
import { sendApnsToAll } from '@/lib/apns';

// VAPID configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@rayo.trade';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Price alert thresholds
const ALERT_THRESHOLDS: Record<string, { threshold: number; displayName: string }> = {
    'BTC': { threshold: 500, displayName: 'Bitcoin' },
    'ETH': { threshold: 100, displayName: 'Ethereum' },
    'GOLD': { threshold: 50, displayName: 'Gold' },
};

// Fetch current prices from Hyperliquid (main) and HIP-3 (Trade.xyz)
async function fetchPrices(): Promise<Record<string, number>> {
    try {
        // Fetch main Hyperliquid prices
        const mainResponse = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'allMids' }),
        });
        const mainData = await mainResponse.json();

        // Fetch HIP-3 (Trade.xyz) prices for GOLD
        const hip3Response = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'allMids', dex: 'xyz' }),
        });
        const hip3Data = await hip3Response.json();

        return {
            'BTC': parseFloat(mainData['BTC'] || '0'),
            'ETH': parseFloat(mainData['ETH'] || '0'),
            'GOLD': parseFloat(hip3Data['xyz:GOLD'] || '0'),
        };
    } catch (err) {
        console.error('[PriceAlerts] Failed to fetch prices:', err);
        return {};
    }
}

// Get last alerted prices from Supabase
async function getLastAlertPrices(): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('price_alert_state')
        .select('symbol, last_alert_price');

    if (error) {
        console.error('[PriceAlerts] Failed to get last prices:', error);
        return {};
    }

    const prices: Record<string, number> = {};
    data?.forEach(row => {
        prices[row.symbol] = Number(row.last_alert_price);
    });
    return prices;
}

// Update last alerted price
async function updateLastAlertPrice(symbol: string, price: number): Promise<void> {
    const { error } = await supabase
        .from('price_alert_state')
        .upsert({
            symbol,
            last_alert_price: price,
            last_alert_at: new Date().toISOString(),
        });

    if (error) {
        console.error('[PriceAlerts] Failed to update price:', error);
    }
}

// Get all push subscriptions
async function getAllSubscriptions(): Promise<any[]> {
    const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth');

    if (error) {
        console.error('[PriceAlerts] Failed to get subscriptions:', error);
        return [];
    }

    return data || [];
}

// Send push notification to all subscribers
async function sendPushToAll(title: string, body: string, data?: Record<string, any>): Promise<number> {
    const subscriptions = await getAllSubscriptions();
    let sent = 0;

    for (const sub of subscriptions) {
        try {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };

            await webPush.sendNotification(
                pushSubscription,
                JSON.stringify({
                    title,
                    body,
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-96x96.png',
                    data: data || {},
                })
            );
            sent++;
        } catch (err: any) {
            // Remove invalid subscriptions
            if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', sub.endpoint);
            }
            console.error('[PriceAlerts] Push failed:', err.message);
        }
    }

    return sent;
}

// Format price for display
function formatPrice(price: number, symbol: string): string {
    if (symbol === 'BTC') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (symbol === 'ETH') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (symbol === 'GOLD') return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(2)}`;
}

export async function GET(request: NextRequest) {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('[PriceAlerts] Unauthorized cron request');
        // Still allow for testing, just log it
    }

    console.log('[PriceAlerts] Cron job started');

    try {
        // Fetch current and last prices
        const currentPrices = await fetchPrices();
        const lastPrices = await getLastAlertPrices();

        const alerts: string[] = [];

        // Check each tracked asset
        for (const [symbol, config] of Object.entries(ALERT_THRESHOLDS)) {
            const currentPrice = currentPrices[symbol];
            const lastPrice = lastPrices[symbol];

            if (!currentPrice || !lastPrice) {
                console.log(`[PriceAlerts] Missing price for ${symbol}: current=${currentPrice}, last=${lastPrice}`);
                continue;
            }

            const priceDist = Math.abs(currentPrice - lastPrice);

            console.log(`[PriceAlerts] ${symbol}: ${currentPrice} vs last alerted ${lastPrice} (dist: ${priceDist.toFixed(2)}, threshold: ${config.threshold})`);

            // Only trigger if we moved at least one full threshold distance from the last alert
            if (priceDist >= config.threshold) {
                const direction = currentPrice > lastPrice ? 1 : -1;
                const numThresholdsCrossed = Math.floor(priceDist / config.threshold);
                const crossedLevel = lastPrice + (direction * numThresholdsCrossed * config.threshold);

                const directionIcon = direction > 0 ? '📈' : '📉';

                const title = `${directionIcon} ${config.displayName} ${formatPrice(crossedLevel, symbol)} Crossed!`;
                const body = `${config.displayName} is now ${formatPrice(currentPrice, symbol)}. Next level: ${formatPrice(crossedLevel + (direction > 0 ? config.threshold : -config.threshold), symbol)}`;

                console.log(`[PriceAlerts] Sending alert: ${title}`);

                const data = { symbol: `${symbol}-USD`, url: `/trade?symbol=${symbol}-USD` };
                // Web Push (browser/PWA) + native APNs (iOS app) — both broadcast.
                const [sent, sentNative] = await Promise.all([
                    sendPushToAll(title, body, data),
                    sendApnsToAll({ title, body, data, collapseId: `price-${symbol}` }),
                ]);

                // Update state to the STABLE threshold level we just crossed
                // This ensures we stay "locked" to the grid and prevent oscillations
                await updateLastAlertPrice(symbol, crossedLevel);

                alerts.push(`${symbol}: ${sent} web + ${sentNative} native sent for level ${crossedLevel}`);
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            prices: currentPrices,
            alerts: alerts.length > 0 ? alerts : 'No alerts triggered',
        });
    } catch (err) {
        console.error('[PriceAlerts] Cron error:', err);
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
