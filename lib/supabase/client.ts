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

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error fetching user:', error);
            }
            return data;
        },

        async create(walletAddress: string, username?: string): Promise<User | null> {
            const { data, error } = await supabase
                .from('users')
                .insert({
                    wallet_address: walletAddress.toLowerCase(),
                    username: username || null,
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

        async getOrCreate(walletAddress: string): Promise<User | null> {
            let user = await this.getByWallet(walletAddress);
            if (!user) {
                user = await this.create(walletAddress);
            }
            return user;
        },
    },

    // Trade operations (for future use)
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
            const { data, error } = await supabase
                .from('trades')
                .insert(trade)
                .select()
                .single();

            if (error) {
                console.error('Error creating trade:', error);
                return null;
            }
            return data;
        },
    },
};
