import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
    console.warn('⚠️ Supabase credentials not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
}

// Create Supabase client (use placeholder during SSR if not configured)
export const supabase: SupabaseClient = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Database types (will be expanded as we add more tables)
export interface User {
    id: string;
    wallet_address: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    referral_code: string | null;
    referred_by: string | null;
    referral_earnings: number;
    created_at: string;
    updated_at: string;
}

export interface Trade {
    id: string;
    user_id: string;
    symbol: string;
    side: 'long' | 'short';
    size: number;
    entry_price: number;
    exit_price: number | null;
    pnl: number | null;
    fee: number | null;
    tid: string | null;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
}

export interface Referral {
    id: string;
    referrer_id: string;
    referred_id: string;
    referral_code: string;
    fee_share_percent: number;
    total_fees_earned: number;
    created_at: string;
}

export interface LeaderboardEntry {
    rank: number;
    user_id: string;
    wallet_address: string;
    username: string | null;
    total_pnl: number;
    trade_count: number;
    win_count: number;
    loss_count: number;
}

export interface TrollboxMessage {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_system?: boolean;
    user?: {
        wallet_address: string;
        username: string | null;
        avatar_url: string | null;
    };
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    sort_order: number;
    asset_count?: number;
}

export interface PushSubscription {
    id: string;
    user_id: string | null;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
    created_at: string;
    updated_at: string;
}

export interface PriceAlert {
    id: string;
    user_id: string;
    symbol: string;
    target_price: number;
    direction: 'above' | 'below';
    is_active: boolean;
    is_triggered: boolean;
    triggered_at: string | null;
    created_at: string;
}

export interface Asset {
    id: string;
    symbol: string;
    name: string;
    full_name: string | null;
    description: string | null;
    is_stock: boolean;
    is_crypto: boolean;
    market_cap: number | null;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
}

// Helper functions for common operations
export const db = {
    // User operations
    users: {
        async getByWallet(walletAddress: string): Promise<User | null> {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress.toLowerCase())
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user:', error);
            }
            return data;
        },

        async create(walletAddress: string, username?: string, referredBy?: string): Promise<User | null> {
            // Generate a simple referral code
            const referralCode = Math.random().toString(36).substring(2, 10);

            const { data, error } = await supabase
                .from('users')
                .insert({
                    wallet_address: walletAddress.toLowerCase(),
                    username: username || null,
                    referral_code: referralCode,
                    referred_by: referredBy || null,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating user:', error);
                return null;
            }
            return data;
        },

        async update(walletAddress: string, updates: Partial<Pick<User, 'username' | 'display_name' | 'avatar_url'>>): Promise<User | null> {
            const { data, error } = await supabase
                .from('users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('wallet_address', walletAddress.toLowerCase())
                .select()
                .single();

            if (error) {
                console.error('Error updating user:', error);
                return null;
            }
            return data;
        },

        async getOrCreate(walletAddress: string, referredBy?: string): Promise<User | null> {
            let user = await this.getByWallet(walletAddress);
            if (!user) {
                user = await this.create(walletAddress, undefined, referredBy);
            }
            return user;
        },

        async getByReferralCode(code: string): Promise<User | null> {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('referral_code', code.toLowerCase())
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user by referral code:', error);
            }
            return data;
        },
    },

    // Trade operations
    trades: {
        async getByUser(userId: string): Promise<Trade[]> {
            const { data, error } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', userId)
                .order('opened_at', { ascending: false });

            if (error) {
                console.error('Error fetching trades:', error);
                return [];
            }
            return data || [];
        },

        async create(trade: Omit<Trade, 'id' | 'opened_at' | 'closed_at'>): Promise<Trade | null> {
            console.log('📝 Attempting to create trade:', trade);
            const { data, error } = await supabase
                .from('trades')
                .insert({
                    ...trade,
                    closed_at: trade.status === 'closed' ? new Date().toISOString() : null,
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Error creating trade:', error.message, error.code, error.details, error.hint);
                return null;
            }
            console.log('✅ Trade created successfully:', data);
            return data;
        },

        async deleteAllByUser(userId: string): Promise<boolean> {
            console.log('🗑️ Deleting all trades for user:', userId);
            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('❌ Error deleting trades:', error);
                return false;
            }
            console.log('✅ All trades deleted for user');
            return true;
        },

        async syncFromFills(userId: string, fills: Array<{
            time: number;
            coin: string;
            px: string;
            sz: string;
            side: string;
            closedPnl: string;
            fee?: string;
            tid?: number | string;
            dir?: string;
        }>): Promise<{ synced: number; totalPnl: number }> {
            console.log('🔄 Syncing trades from fills for user:', userId, 'fills count:', fills.length);

            // Get existing trade IDs (tids) to avoid duplicates
            // We use the 'tid' column which stores the Hyperliquid trade ID
            const { data: existingTrades } = await supabase
                .from('trades')
                .select('tid')
                .eq('user_id', userId)
                .not('tid', 'is', null);

            const existingTids = new Set((existingTrades || []).map(t => String(t.tid)));

            let synced = 0;
            let totalPnl = 0;

            // Only import fills with closedPnl (completed trades)
            for (const fill of fills) {
                const pnl = parseFloat(fill.closedPnl || '0');
                const fee = parseFloat(fill.fee || '0');
                const tid = fill.tid ? String(fill.tid) : null;

                // Skip fills with 0 PnL (opening trades or dust) unless they have a fee
                if (pnl === 0 && fee === 0) continue;

                // Skip if we already have this trade
                if (tid && existingTids.has(tid)) continue;

                totalPnl += pnl;

                // Normalize coin name
                const cleanCoin = fill.coin.replace(/-PERP$/i, '').replace(/^xyz:/i, '');
                const symbol = `${cleanCoin}-USD`;

                // Determine side from the fill
                const side = fill.side.toLowerCase() === 'b' || fill.side.toLowerCase() === 'buy' ? 'long' : 'short';

                const trade: Omit<Trade, 'id' | 'opened_at' | 'closed_at'> = {
                    user_id: userId,
                    symbol,
                    side: side as 'long' | 'short',
                    size: parseFloat(fill.sz),
                    entry_price: parseFloat(fill.px),
                    exit_price: parseFloat(fill.px),
                    pnl: pnl,
                    fee: fee,
                    tid: tid,
                    status: 'closed',
                };

                // Insert with original timestamp
                const { error } = await supabase
                    .from('trades')
                    .insert({
                        ...trade,
                        opened_at: new Date(fill.time).toISOString(),
                        closed_at: new Date(fill.time).toISOString(),
                    });

                if (!error) {
                    synced++;
                } else {
                    console.error('Error inserting trade:', error);
                }
            }

            console.log(`✅ Synced ${synced} new trades, total PnL processed: $${totalPnl.toFixed(2)}`);
            return { synced, totalPnl };
        },
    },

    // Leaderboard operations
    leaderboard: {
        async get(period: 'daily' | 'weekly' | 'all' = 'all', limit: number = 100): Promise<LeaderboardEntry[]> {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                time_period: period,
                limit_count: limit,
            });

            if (error) {
                console.error('Error fetching leaderboard:', error);
                return [];
            }
            return data || [];
        },

        async getUserRank(userId: string, period: 'daily' | 'weekly' | 'all' = 'all'): Promise<LeaderboardEntry | null> {
            const leaderboard = await this.get(period, 1000);
            return leaderboard.find(e => e.user_id === userId) || null;
        },
    },

    // Referral operations
    referrals: {
        async create(referrerId: string, referredId: string, code: string): Promise<Referral | null> {
            const { data, error } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: referrerId,
                    referred_id: referredId,
                    referral_code: code,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating referral:', error);
                return null;
            }
            return data;
        },

        async getByReferrer(referrerId: string): Promise<Referral[]> {
            const { data, error } = await supabase
                .from('referrals')
                .select('*')
                .eq('referrer_id', referrerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching referrals:', error);
                return [];
            }
            return data || [];
        },

        async getReferredUsers(referrerId: string): Promise<User[]> {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('referred_by', referrerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching referred users:', error);
                return [];
            }
            return data || [];
        },

        async getTotalEarnings(referrerId: string): Promise<number> {
            const { data, error } = await supabase
                .from('referrals')
                .select('total_fees_earned')
                .eq('referrer_id', referrerId);

            if (error) {
                console.error('Error fetching referral earnings:', error);
                return 0;
            }
            return data?.reduce((sum, r) => sum + (r.total_fees_earned || 0), 0) || 0;
        },

        async addEarnings(referralId: string, amount: number): Promise<void> {
            const { error } = await supabase.rpc('increment_referral_earnings', {
                ref_id: referralId,
                amount: amount,
            });

            if (error) {
                console.error('Error adding referral earnings:', error);
            }
        },
    },

    // Trollbox operations
    trollbox: {
        async getRecent(limit: number = 50): Promise<TrollboxMessage[]> {
            const { data, error } = await supabase
                .from('trollbox_messages')
                .select(`
                    *,
                    user:users (
                        wallet_address,
                        username,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching trollbox messages:', error);
                return [];
            }
            return (data || []).reverse();
        },

        async sendMessage(userId: string, content: string): Promise<TrollboxMessage | null> {
            const { data, error } = await supabase
                .from('trollbox_messages')
                .insert({
                    user_id: userId,
                    content: content,
                })
                .select(`
                    *,
                    user:users (
                        wallet_address,
                        username,
                        avatar_url
                    )
                `)
                .single();

            if (error) {
                console.error('Error sending message:', error);
                return null;
            }
            return data;
        },

        subscribe(callback: (message: TrollboxMessage) => void) {
            return supabase
                .channel('trollbox_messages')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'trollbox_messages',
                    },
                    async (payload) => {
                        // Fetch the user data for the new message
                        const { data: userData } = await supabase
                            .from('users')
                            .select('wallet_address, username, avatar_url')
                            .eq('id', payload.new.user_id)
                            .single();

                        const fullMessage: TrollboxMessage = {
                            ...payload.new as TrollboxMessage,
                            user: userData || undefined
                        };
                        callback(fullMessage);
                    }
                )
                .subscribe();
        },
    },

    // Categories operations
    categories: {
        async getAll(): Promise<Category[]> {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('Error fetching categories:', error);
                return [];
            }
            return data || [];
        },

        async getAllWithCounts(): Promise<Category[]> {
            const { data, error } = await supabase.rpc('get_categories_with_counts');

            if (error) {
                // PGRST202 = function not found - silently return empty (will fallback to getAll)
                if (error.code === 'PGRST202') {
                    return [];
                }
                console.error('Error fetching categories with counts:', error);
                return [];
            }
            return data || [];
        },

        async getBySlug(slug: string): Promise<Category | null> {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching category:', error);
            }
            return data;
        },
    },

    // Assets operations
    assets: {
        async getAll(): Promise<Asset[]> {
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .order('symbol', { ascending: true });

            if (error) {
                console.error('Error fetching assets:', error);
                return [];
            }
            return data || [];
        },

        async getBySymbol(symbol: string): Promise<Asset | null> {
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('symbol', symbol)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching asset:', error);
            }
            return data;
        },

        async getByCategory(categorySlug: string): Promise<Asset[]> {
            const { data, error } = await supabase.rpc('get_assets_by_category', {
                category_slug: categorySlug,
            });

            if (error) {
                console.error('Error fetching assets by category:', error);
                return [];
            }
            return data || [];
        },

        async getCategoriesForAsset(assetId: string): Promise<Category[]> {
            const { data, error } = await supabase
                .from('asset_categories')
                .select(`
                    category:categories (
                        id,
                        name,
                        slug,
                        description,
                        color,
                        icon,
                        sort_order
                    )
                `)
                .eq('asset_id', assetId);

            if (error) {
                console.error('Error fetching asset categories:', error);
                return [];
            }
            return (data || []).map(item => item.category as any).filter(Boolean);
        },
    },

    // Push subscriptions operations
    pushSubscriptions: {
        async save(
            endpoint: string,
            keys: { p256dh: string; auth: string },
            userId?: string,
            userAgent?: string
        ): Promise<PushSubscription | null> {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    user_id: userId || null,
                    user_agent: userAgent || null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'endpoint',
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving push subscription:', error);
                return null;
            }
            return data;
        },

        async remove(endpoint: string): Promise<boolean> {
            const { error } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', endpoint);

            if (error) {
                console.error('Error removing push subscription:', error);
                return false;
            }
            return true;
        },

        async getByUser(userId: string): Promise<PushSubscription[]> {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching user subscriptions:', error);
                return [];
            }
            return data || [];
        },

        async getAll(): Promise<PushSubscription[]> {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('*');

            if (error) {
                console.error('Error fetching all subscriptions:', error);
                return [];
            }
            return data || [];
        },

        async linkToUser(endpoint: string, userId: string): Promise<boolean> {
            const { error } = await supabase
                .from('push_subscriptions')
                .update({ user_id: userId, updated_at: new Date().toISOString() })
                .eq('endpoint', endpoint);

            if (error) {
                console.error('Error linking subscription to user:', error);
                return false;
            }
            return true;
        },
    },

    // Price alerts operations
    priceAlerts: {
        async create(
            userId: string,
            symbol: string,
            targetPrice: number,
            direction: 'above' | 'below'
        ): Promise<PriceAlert | null> {
            const { data, error } = await supabase
                .from('price_alerts')
                .insert({
                    user_id: userId,
                    symbol,
                    target_price: targetPrice,
                    direction,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating price alert:', error);
                return null;
            }
            return data;
        },

        async getByUser(userId: string): Promise<PriceAlert[]> {
            const { data, error } = await supabase
                .from('price_alerts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching price alerts:', error);
                return [];
            }
            return data || [];
        },

        async getActiveBySymbol(symbol: string): Promise<PriceAlert[]> {
            const { data, error } = await supabase
                .from('price_alerts')
                .select('*')
                .eq('symbol', symbol)
                .eq('is_active', true)
                .eq('is_triggered', false);

            if (error) {
                console.error('Error fetching alerts for symbol:', error);
                return [];
            }
            return data || [];
        },

        async markTriggered(alertId: string): Promise<boolean> {
            const { error } = await supabase
                .from('price_alerts')
                .update({
                    is_triggered: true,
                    is_active: false,
                    triggered_at: new Date().toISOString(),
                })
                .eq('id', alertId);

            if (error) {
                console.error('Error marking alert as triggered:', error);
                return false;
            }
            return true;
        },

        async delete(alertId: string): Promise<boolean> {
            const { error } = await supabase
                .from('price_alerts')
                .delete()
                .eq('id', alertId);

            if (error) {
                console.error('Error deleting price alert:', error);
                return false;
            }
            return true;
        },
    },
};
