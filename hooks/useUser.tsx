'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { db, User } from '@/lib/supabase/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';

const REFERRAL_STORAGE_KEY = 'rayo_referral_code';

interface UserContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    updateUsername: (username: string) => Promise<{ success: boolean; message: string }>;
    updateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ success: boolean; message: string }>;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Check for referral code in URL on page load
function getAndStoreReferralCode(): string | null {
    if (typeof window === 'undefined') return null;

    // Check URL params for ref code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
        // Store in localStorage for later use (after wallet connect)
        localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
        console.log('📎 Stored referral code:', refCode);
        return refCode;
    }

    // Return stored referral code if exists
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

export function UserProvider({ children }: { children: ReactNode }) {
    const { address, connected } = useHyperliquid();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check for referral code on mount
    useEffect(() => {
        getAndStoreReferralCode();
    }, []);

    // Fetch or create user when wallet connects
    const fetchOrCreateUser = useCallback(async () => {
        if (!address || !connected) {
            setUser(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check if user exists
            let userData = await db.users.getByWallet(address);

            if (!userData) {
                // New user - check for referral code
                const referralCode = typeof window !== 'undefined'
                    ? localStorage.getItem(REFERRAL_STORAGE_KEY)
                    : null;

                let referrerId: string | undefined;

                if (referralCode) {
                    // Look up referrer by code
                    const referrer = await db.users.getByReferralCode(referralCode);
                    if (referrer) {
                        referrerId = referrer.id;
                        console.log('🔗 Found referrer:', referrer.username || referrer.wallet_address);

                        // Create referral record after user is created
                        setTimeout(async () => {
                            const newUser = await db.users.getByWallet(address);
                            if (newUser && referrer) {
                                await db.referrals.create(referrer.id, newUser.id, referralCode);
                                console.log('✅ Created referral link');
                                // Clear stored referral code
                                localStorage.removeItem(REFERRAL_STORAGE_KEY);
                            }
                        }, 1000);
                    }
                }

                // Create user with referral info
                userData = await db.users.create(address, undefined, referrerId);
            }

            setUser(userData);
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err instanceof Error ? err.message : 'Failed to load user data');
        } finally {
            setLoading(false);
        }
    }, [address, connected]);

    // Auto-fetch user on wallet connection
    useEffect(() => {
        fetchOrCreateUser();
    }, [fetchOrCreateUser]);

    // Update username
    const updateUsername = useCallback(async (username: string): Promise<{ success: boolean; message: string }> => {
        if (!address) {
            return { success: false, message: 'Wallet not connected' };
        }

        const trimmedUsername = username.trim().toLowerCase();
        if (trimmedUsername.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters' };
        }
        if (trimmedUsername.length > 20) {
            return { success: false, message: 'Username must be 20 characters or less' };
        }
        if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
            return { success: false, message: 'Username can only contain letters, numbers, and underscores' };
        }

        try {
            const updatedUser = await db.users.update(address, { username: trimmedUsername });
            if (updatedUser) {
                setUser(updatedUser);
                return { success: true, message: 'Username updated!' };
            }
            return { success: false, message: 'Username already taken' };
        } catch (err: any) {
            if (err?.code === '23505') {
                return { success: false, message: 'Username already taken' };
            }
            return { success: false, message: err?.message || 'Failed to update username' };
        }
    }, [address]);

    // Update profile
    const updateProfile = useCallback(async (updates: { display_name?: string; avatar_url?: string }): Promise<{ success: boolean; message: string }> => {
        if (!address) {
            return { success: false, message: 'Wallet not connected' };
        }

        try {
            const updatedUser = await db.users.update(address, updates);
            if (updatedUser) {
                setUser(updatedUser);
                return { success: true, message: 'Profile updated!' };
            }
            return { success: false, message: 'Failed to update profile' };
        } catch (err: any) {
            return { success: false, message: err?.message || 'Failed to update profile' };
        }
    }, [address]);

    const refreshUser = useCallback(async () => {
        await fetchOrCreateUser();
    }, [fetchOrCreateUser]);

    return (
        <UserContext.Provider value={{
            user,
            loading,
            error,
            updateUsername,
            updateProfile,
            refreshUser,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

