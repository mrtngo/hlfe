/**
 * Push Notification Utilities
 * Server-side functions to send push notifications
 */

const PUSH_API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PUSH_API_SECRET = process.env.PUSH_API_SECRET || 'dev-secret-change-me';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const response = await fetch(`${PUSH_API_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUSH_API_SECRET}`,
      },
      body: JSON.stringify({
        userId,
        payload,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Push] Failed to send notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Send push notification to all users
 */
export async function sendPushBroadcast(
  payload: NotificationPayload
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const response = await fetch(`${PUSH_API_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUSH_API_SECRET}`,
      },
      body: JSON.stringify({
        broadcast: true,
        payload,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Push] Failed to broadcast notification:', error);
    return { success: false, error: 'Failed to broadcast notification' };
  }
}

// Pre-built notification templates

/**
 * Notify user when their order is filled
 */
export function notifyOrderFilled(
  userId: string,
  symbol: string,
  side: 'long' | 'short',
  size: number,
  price: number
) {
  return sendPushToUser(userId, {
    title: `Order Filled`,
    body: `${side.toUpperCase()} ${size} ${symbol} @ $${price.toLocaleString()}`,
    tag: `order-${symbol}`,
    url: `/trade?symbol=${symbol}`,
    data: { symbol, side, size, price },
  });
}

/**
 * Notify user when position is liquidated
 */
export function notifyLiquidation(
  userId: string,
  symbol: string,
  pnl: number
) {
  return sendPushToUser(userId, {
    title: `Position Liquidated`,
    body: `${symbol} position liquidated. Loss: $${Math.abs(pnl).toLocaleString()}`,
    tag: `liquidation-${symbol}`,
    url: `/`,
    data: { symbol, pnl, type: 'liquidation' },
  });
}

/**
 * Notify user about price alert
 */
export function notifyPriceAlert(
  userId: string,
  symbol: string,
  price: number,
  direction: 'above' | 'below',
  targetPrice: number
) {
  return sendPushToUser(userId, {
    title: `Price Alert: ${symbol}`,
    body: `${symbol} is now ${direction} $${targetPrice.toLocaleString()} (Current: $${price.toLocaleString()})`,
    tag: `price-alert-${symbol}`,
    url: `/trade?symbol=${symbol}`,
    data: { symbol, price, direction, targetPrice },
  });
}

/**
 * Notify user about TP/SL triggered
 */
export function notifyTpSlTriggered(
  userId: string,
  symbol: string,
  type: 'TP' | 'SL',
  pnl: number
) {
  const isProfit = pnl >= 0;
  return sendPushToUser(userId, {
    title: `${type} Triggered`,
    body: `${symbol} ${type === 'TP' ? 'Take Profit' : 'Stop Loss'} hit. ${isProfit ? 'Profit' : 'Loss'}: $${Math.abs(pnl).toLocaleString()}`,
    tag: `tpsl-${symbol}`,
    url: `/`,
    data: { symbol, type, pnl },
  });
}

/**
 * Broadcast price milestone (e.g., BTC hits $100k)
 */
export function broadcastPriceMilestone(
  symbol: string,
  milestone: string,
  price: number
) {
  return sendPushBroadcast({
    title: `${symbol} Milestone!`,
    body: `${symbol} just hit ${milestone}! Current price: $${price.toLocaleString()}`,
    tag: `milestone-${symbol}`,
    url: `/trade?symbol=${symbol}`,
    data: { symbol, milestone, price },
  });
}
