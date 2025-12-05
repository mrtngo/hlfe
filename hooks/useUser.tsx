'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { db, User } from '@/lib/supabase/client';
import { useHyperliquid } from '@/hooks/useHyperliquid';

interface UserContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    updateUsername: (username: string) => Promise<{ success: boolean; message: string }>;
    updateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<{ success: boolean; message: string }>;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { address, connected } = useHyperliquid();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch or create user when wallet connects
    const fetchOrCreateUser = useCallback(async () => {
        if (!address || !connected) {
            setUser(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userData = await db.users.getOrCreate(address);
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

        // Validate username
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
            // Handle unique constraint violation
            if (err?.code === '23505') {
                return { success: false, message: 'Username already taken' };
            }
            return { success: false, message: err?.message || 'Failed to update username' };
        }
    }, [address]);

    // Update profile (display name, avatar)
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

    // Manual refresh
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
