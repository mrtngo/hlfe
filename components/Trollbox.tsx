'use client';

import { useState, useEffect, useRef } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { db, TrollboxMessage } from '@/lib/supabase/client';
import { Send, MessageSquare, X, ShieldAlert, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrollboxProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Trollbox({ isOpen, onClose }: TrollboxProps) {
    const { t } = useLanguage();
    const { address } = useHyperliquid();
    const [messages, setMessages] = useState<TrollboxMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom whenever messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Fetch initial messages and current user
    useEffect(() => {
        const initTrollbox = async () => {
            setIsLoading(true);
            try {
                // Fetch recent messages
                const recent = await db.trollbox.getRecent(50);
                setMessages(recent);

                // Fetch current user details if logged in
                if (address) {
                    const user = await db.users.getByWallet(address);
                    setCurrentUser(user);
                }
            } catch (error) {
                console.error('Failed to initialize Trollbox:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initTrollbox();

        // Subscribe to new messages
        const subscription = db.trollbox.subscribe((msg) => {
            setMessages(prev => {
                // Avoid duplicates
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [address]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUser || isSending) return;

        setIsSending(true);
        try {
            const sent = await db.trollbox.sendMessage(currentUser.id, newMessage.trim());
            if (sent) {
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-[100] flex flex-col shadow-2xl transition-all duration-300 ease-in-out transform"
            style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(16px)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#FFFF00]" />
                    <h2 className="text-lg font-bold text-white">Trollbox</h2>
                    <div className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        Live
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                        <div className="w-8 h-8 border-2 border-[#FFFF00]/20 border-t-[#FFFF00] rounded-full animate-spin" />
                        <span className="text-sm">Loading chat history...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <MessageSquare className="w-12 h-12 text-white/10 mb-4" />
                        <h3 className="text-white font-medium mb-1">No messages yet</h3>
                        <p className="text-sm text-gray-500">Be the first one to say hi!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="group flex flex-col gap-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-5 h-5 rounded-full bg-[#FFFF00]/10 flex items-center justify-center border border-[#FFFF00]/20 overflow-hidden"
                                    >
                                        {msg.user?.avatar_url ? (
                                            <img src={msg.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-[#FFFF00]" />
                                        )}
                                    </div>
                                    <span className={`text-[13px] font-bold ${msg.is_system ? 'text-yellow-400' : 'text-gray-200'}`}>
                                        {msg.user?.username || (msg.user?.wallet_address ? `${msg.user.wallet_address.slice(0, 6)}...${msg.user.wallet_address.slice(-4)}` : 'System')}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }).replace('about ', '')}
                                </span>
                            </div>
                            <div
                                className={`text-[14px] p-2.5 rounded-2xl rounded-tl-none break-words ${msg.is_system
                                        ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 italic'
                                        : 'bg-white/5 border border-white/10 text-gray-300'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 shrink-0 bg-black/40">
                {!address ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-sm text-red-400 font-medium">Connect wallet to chat</p>
                    </div>
                ) : !currentUser ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-sm text-red-400 font-medium">Initialize profile to chat</p>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFFF00]/50 transition-all"
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            className="p-3 rounded-full bg-[#FFFF00] text-black disabled:opacity-50 disabled:grayscale transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0"
                        >
                            <Send className="w-5 h-5 flex-shrink-0" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
