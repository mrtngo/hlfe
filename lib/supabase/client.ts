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
};
