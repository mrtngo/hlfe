'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { db, User } from '@/lib/supabase/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';

const REFERRAL_STORAGE_KEY = 'rayo_referral_code';

// Validate referral code format: alphanumeric, underscore, hyphen, 3-20 chars
const isValidReferralCode = (code: string): boolean =>
    typeof code === 'string' &&
    code.length >= 3 &&
    code.length <= 20 &&
    /^[a-zA-Z0-9_-]+$/.test(code);

// Sanitize display name: strip HTML tags, limit length, trim whitespace
const sanitizeDisplayName = (name: string): string => {
    if (typeof name !== 'string') return '';
    // Remove HTML tags, trim, and limit to 50 chars
    return name
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .replace(/[<>"'&]/g, '') // Remove potentially dangerous chars
        .trim()
        .slice(0, 50);
};

// Validate avatar URL: must be HTTPS from allowed domains
const isValidAvatarUrl = (url: string): boolean => {
    if (typeof url !== 'string' || !url) return true; // Empty is OK
    try {
        const parsed = new URL(url);
        // Only allow HTTPS
        if (parsed.protocol !== 'https:') return false;
        // Whitelist of allowed avatar domains
        const allowedDomains = [
            'avatars.githubusercontent.com',
            'lh3.googleusercontent.com',
            'pbs.twimg.com',
            'abs.twimg.com',
            'unavatar.io',
            'api.dicebear.com',
            'cdn.discordapp.com',
            'i.imgur.com',
            'ipfs.io',
            'cloudflare-ipfs.com',
        ];
        return allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
};

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

    if (refCode && isValidReferralCode(refCode)) {
        // Store in localStorage for later use (after wallet connect)
        localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
        console.log('📎 Stored referral code:', refCode);
        return refCode;
    } else if (refCode) {
        console.warn('⚠️ Invalid referral code format:', refCode);
    }

    // Return stored referral code if exists and valid
    const storedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (storedCode && isValidReferralCode(storedCode)) {
        return storedCode;
    }

    // Clear invalid stored code
    if (storedCode) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }

    return null;
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

                let referrer: User | null = null;

                if (referralCode && isValidReferralCode(referralCode)) {
                    // Look up referrer by code
                    referrer = await db.users.getByReferralCode(referralCode);
                    if (referrer) {
                        console.log('🔗 Found referrer:', referrer.username || referrer.wallet_address);
                    }
                }

                // Create user with referral info
                userData = await db.users.create(address, undefined, referrer?.id);

                // Create referral record immediately after user creation (no race condition)
                if (userData && referrer && referralCode) {
                    try {
                        await db.referrals.create(referrer.id, userData.id, referralCode);
                        console.log('✅ Created referral link');
                        // Clear stored referral code only after successful creation
                        localStorage.removeItem(REFERRAL_STORAGE_KEY);
                    } catch (refErr) {
                        console.error('Failed to create referral link:', refErr);
                        // Don't fail user creation if referral fails
                    }
                }
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

    // Update profile with sanitization
    const updateProfile = useCallback(async (updates: { display_name?: string; avatar_url?: string }): Promise<{ success: boolean; message: string }> => {
        if (!address) {
            return { success: false, message: 'Wallet not connected' };
        }

        // Sanitize and validate inputs
        const sanitizedUpdates: { display_name?: string; avatar_url?: string } = {};

        if (updates.display_name !== undefined) {
            const sanitized = sanitizeDisplayName(updates.display_name);
            if (sanitized.length === 0 && updates.display_name.length > 0) {
                return { success: false, message: 'Display name contains invalid characters' };
            }
            sanitizedUpdates.display_name = sanitized;
        }

        if (updates.avatar_url !== undefined) {
            if (updates.avatar_url && !isValidAvatarUrl(updates.avatar_url)) {
                return { success: false, message: 'Avatar URL must be HTTPS from an allowed domain' };
            }
            sanitizedUpdates.avatar_url = updates.avatar_url;
        }

        try {
            const updatedUser = await db.users.update(address, sanitizedUpdates);
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

