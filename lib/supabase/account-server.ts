import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { User } from '@/lib/supabase/client';

export interface HyperliquidFillInput {
    time: number;
    coin: string;
    px: string;
    sz: string;
    side: string;
    closedPnl: string;
    fee?: string;
    tid?: number | string;
    dir?: string;
}

function isValidReferralCode(code: string): boolean {
    return /^[a-z0-9_-]{3,20}$/i.test(code);
}

function randomReferralCode(): string {
    return Math.random().toString(36).slice(2, 10);
}

async function createUniqueReferralCode(supabase: SupabaseClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = randomReferralCode();
        const { data } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle();
        if (!data) return code;
    }
    return `${randomReferralCode()}${Date.now().toString(36).slice(-4)}`.slice(0, 20);
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getOrCreateUserForWallet(
    walletAddress: string,
    referralCode?: string | null,
): Promise<User> {
    const supabase = getSupabaseServiceClient();
    const existing = await getUserByWallet(walletAddress);
    if (existing) return existing;

    let referrer: User | null = null;
    const cleanReferralCode = referralCode?.trim().toLowerCase() ?? null;
    if (cleanReferralCode && isValidReferralCode(cleanReferralCode)) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('referral_code', cleanReferralCode)
            .maybeSingle();
        if (error) throw error;
        referrer = data;
    }

    const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
            wallet_address: walletAddress,
            referral_code: await createUniqueReferralCode(supabase),
            referred_by: referrer?.id ?? null,
        })
        .select()
        .single();

    if (createError) throw createError;

    if (referrer && cleanReferralCode) {
        await supabase
            .from('referrals')
            .insert({
                referrer_id: referrer.id,
                referred_id: created.id,
                referral_code: cleanReferralCode,
            });
    }

    return created;
}

export async function exportAccountData(walletAddress: string): Promise<Record<string, unknown>> {
    const supabase = getSupabaseServiceClient();
    const user = await getUserByWallet(walletAddress);
    const userId = user?.id ?? null;

    const grab = async (table: string, column: string, value: string | null) => {
        if (!value) return [];
        const { data, error } = await supabase.from(table).select('*').eq(column, value);
        if (error) throw error;
        return data ?? [];
    };

    return {
        exported_at: new Date().toISOString(),
        wallet_address: walletAddress,
        profile: user ?? null,
        trades: await grab('trades', 'user_id', userId),
        referrals_made: await grab('referrals', 'referrer_id', userId),
        referral_received: await grab('referrals', 'referred_id', userId),
        trollbox_messages: await grab('trollbox_messages', 'user_id', userId),
        price_alerts: await grab('price_alerts', 'user_id', userId),
        money_movements: await grab('money_movements', 'user_id', userId),
        dca_schedules: await grab('dca_schedules', 'wallet_address', walletAddress),
        device_tokens: await grab('device_tokens', 'wallet_address', walletAddress),
        consents: await grab('data_consents', 'wallet_address', walletAddress),
    };
}

export async function deleteAccountData(walletAddress: string): Promise<void> {
    const supabase = getSupabaseServiceClient();
    const user = await getUserByWallet(walletAddress);

    await supabase.from('dca_schedules').delete().eq('wallet_address', walletAddress);
    await supabase.from('device_tokens').delete().eq('wallet_address', walletAddress);

    if (!user) return;
    const { error } = await supabase.from('users').delete().eq('id', user.id);
    if (error) throw error;
}

export async function syncTradesFromFills(
    userId: string,
    fills: HyperliquidFillInput[],
): Promise<{ synced: number; totalPnl: number }> {
    const supabase = getSupabaseServiceClient();
    const { data: existingTrades, error: existingError } = await supabase
        .from('trades')
        .select('tid')
        .eq('user_id', userId)
        .not('tid', 'is', null);

    if (existingError) throw existingError;

    const existingTids = new Set((existingTrades || []).map((trade) => String(trade.tid)));
    let synced = 0;
    let totalPnl = 0;

    for (const fill of fills.slice(0, 5000)) {
        const pnl = Number.parseFloat(fill.closedPnl || '0');
        const fee = Number.parseFloat(fill.fee || '0');
        const tid = fill.tid ? String(fill.tid) : null;
        const time = Number(fill.time);
        const size = Number.parseFloat(fill.sz);
        const price = Number.parseFloat(fill.px);

        if (!Number.isFinite(time) || !Number.isFinite(size) || !Number.isFinite(price)) continue;
        if (pnl === 0 && fee === 0) continue;
        if (tid && existingTids.has(tid)) continue;

        totalPnl += pnl;

        const cleanCoin = fill.coin.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
        const symbol = `${cleanCoin}-USD`;
        const side = fill.side.toLowerCase() === 'b' || fill.side.toLowerCase() === 'buy' ? 'long' : 'short';

        const { error } = await supabase
            .from('trades')
            .insert({
                user_id: userId,
                symbol,
                side,
                size,
                entry_price: price,
                exit_price: price,
                pnl,
                fee,
                tid,
                status: 'closed',
                opened_at: new Date(time).toISOString(),
                closed_at: new Date(time).toISOString(),
            });

        if (!error) {
            synced += 1;
            if (tid) existingTids.add(tid);
        } else if (error.code !== '23505') {
            throw error;
        }
    }

    return { synced, totalPnl };
}
