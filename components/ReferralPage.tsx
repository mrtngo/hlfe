'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useLanguage } from '@/hooks/useLanguage';
import { db, User } from '@/lib/supabase/client';
import { Gift, Copy, Check, Users, DollarSign, Share2, UserPlus } from 'lucide-react';

export default function ReferralPage() {
    const { t } = useLanguage();
    const { user } = useUser();
    const [copied, setCopied] = useState(false);
    const [referredUsers, setReferredUsers] = useState<User[]>([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [loading, setLoading] = useState(true);

    const referralLink = user?.referral_code
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${user.referral_code}`
        : '';

    useEffect(() => {
        const fetchReferralData = async () => {
            if (!user?.id) return;

            setLoading(true);
            try {
                const [users, earnings] = await Promise.all([
                    db.referrals.getReferredUsers(user.id),
                    db.referrals.getTotalEarnings(user.id),
                ]);
                setReferredUsers(users);
                setTotalEarnings(earnings);
            } catch (err) {
                console.error('Error fetching referral data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchReferralData();
    }, [user?.id]);

    const copyReferralLink = async () => {
        if (referralLink) {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto text-center py-12">
                <Gift className="w-16 h-16 mx-auto mb-4 text-[#FFFF00] opacity-50" />
                <h2 className="text-xl font-bold text-white mb-2">Connect to view referrals</h2>
                <p className="text-coffee-medium">Login to get your unique referral code</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-3 mb-2">
                    <Gift className="w-8 h-8 text-[#FFFF00]" />
                    <h1 className="text-3xl font-bold text-white">Referrals</h1>
                </div>
                <p className="text-coffee-medium">Invite friends and earn 10% of their trading fees</p>
            </div>

            {/* Referral Link Card */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Share2 className="w-5 h-5 text-[#FFFF00]" />
                    Your Referral Link
                </div>

                <div className="bg-black/40 rounded-2xl p-4 flex items-center gap-3">
                    <code className="flex-1 text-sm text-[#FFFF00] font-mono truncate">
                        {referralLink || 'Loading...'}
                    </code>
                    <button
                        onClick={copyReferralLink}
                        className="flex-shrink-0 p-3 bg-[#FFFF00] text-black rounded-xl hover:opacity-90 transition-all"
                    >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>

                <div className="text-sm text-coffee-medium text-center">
                    Your code: <span className="text-[#FFFF00] font-mono font-bold">{user.referral_code || '---'}</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#FFFF00]/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#FFFF00]" />
                        </div>
                        <div className="text-sm text-coffee-medium">Referrals</div>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {loading ? '...' : referredUsers.length}
                    </div>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#FFFF00]/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-[#FFFF00]" />
                        </div>
                        <div className="text-sm text-coffee-medium">Earned</div>
                    </div>
                    <div className="text-3xl font-bold text-bullish font-mono">
                        ${loading ? '...' : totalEarnings.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* How it Works */}
            <div className="glass-card p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">How it Works</h2>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 flex items-center justify-center text-[#FFFF00] font-bold text-sm">1</div>
                        <div>
                            <div className="font-semibold text-white">Share your link</div>
                            <div className="text-sm text-coffee-medium">Send your referral link to friends</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 flex items-center justify-center text-[#FFFF00] font-bold text-sm">2</div>
                        <div>
                            <div className="font-semibold text-white">They sign up & trade</div>
                            <div className="text-sm text-coffee-medium">Friends join using your link and start trading</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFFF00]/20 flex items-center justify-center text-[#FFFF00] font-bold text-sm">3</div>
                        <div>
                            <div className="font-semibold text-white">Earn 10% of fees</div>
                            <div className="text-sm text-coffee-medium">You earn 10% of the builder fees from their trades</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Referred Users List */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#FFFF00]" />
                    <h2 className="text-lg font-bold text-white">Your Referrals</h2>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-coffee-medium">Loading...</div>
                ) : referredUsers.length === 0 ? (
                    <div className="text-center py-8 text-coffee-medium">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No referrals yet</p>
                        <p className="text-sm mt-1">Share your link to start earning!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {referredUsers.map((referredUser) => (
                            <div
                                key={referredUser.id}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#FFFF00]/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-[#FFFF00]" />
                                    </div>
                                    <span className="text-white">
                                        {referredUser.username ? `@${referredUser.username}` : formatAddress(referredUser.wallet_address)}
                                    </span>
                                </div>
                                <span className="text-sm text-coffee-medium">
                                    {new Date(referredUser.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
