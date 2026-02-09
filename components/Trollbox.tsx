'use client';

import { useState, useEffect, useRef } from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';
import { useLanguage } from '@/hooks/useLanguage';
import { db, TrollboxMessage } from '@/lib/supabase/client';
import { Send, MessageSquare, X, User, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TrollboxProps {
    isOpen: boolean;
    onClose: () => void;
}

// Generate consistent color for each user based on their ID
function getUserColor(userId: string): string {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#FF8FAB', '#6C5CE7', '#00D9FF', '#FFD60A', '#FF6348',
        '#A29BFE', '#FD79A8', '#FDCB6E', '#00B894', '#E17055',
    ];

    // Use user ID to deterministically pick a color
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

export default function Trollbox({ isOpen, onClose }: TrollboxProps) {
    const { t } = useLanguage();
    const { address } = useHyperliquid();
    const [messages, setMessages] = useState<TrollboxMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const userScrolledRef = useRef(false);
    const prevMessagesLengthRef = useRef(0);

    // Scroll to bottom
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        userScrolledRef.current = false;
        setShowScrollButton(false);
    };

    // Check if user is at bottom
    const isAtBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return true;
        const threshold = 100; // pixels from bottom
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    };

    // Handle scroll events
    const handleScroll = () => {
        const atBottom = isAtBottom();
        setShowScrollButton(!atBottom);
        if (!atBottom) {
            userScrolledRef.current = true;
        }
    };

    // Auto-scroll only when: 1) user is at bottom, 2) new messages arrive, or 3) user sends message
    useEffect(() => {
        if (!isOpen) return;

        const isNewMessage = messages.length > prevMessagesLengthRef.current;
        prevMessagesLengthRef.current = messages.length;

        // Auto-scroll if: user hasn't manually scrolled up OR they're at the bottom
        if (isNewMessage && (!userScrolledRef.current || isAtBottom())) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Fetch messages function
    const fetchMessages = async () => {
        try {
            const recent = await db.trollbox.getRecent(100);
            setMessages(recent);

            // Count unique users in last 5 minutes for "online" indicator
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentUsers = new Set(
                recent
                    .filter(m => new Date(m.created_at) > fiveMinutesAgo)
                    .map(m => m.user_id)
            );
            setOnlineCount(recentUsers.size);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    // Fetch initial messages and current user
    useEffect(() => {
        const initTrollbox = async () => {
            setIsLoading(true);
            try {
                await fetchMessages();

                // Fetch current user details if logged in
                if (address) {
                    let user = await db.users.getByWallet(address);
                    if (!user) {
                        // Auto-create user if doesn't exist
                        user = await db.users.create(address);
                    }
                    setCurrentUser(user);
                }
            } catch (error) {
                console.error('Failed to initialize Trollbox:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            initTrollbox();

            // Poll for new messages every 3 seconds
            pollIntervalRef.current = setInterval(fetchMessages, 3000);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [address, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUser || isSending) return;

        setIsSending(true);
        try {
            const sent = await db.trollbox.sendMessage(currentUser.id, newMessage.trim());
            if (sent) {
                setNewMessage('');
                // Immediately fetch new messages to show the sent message
                await fetchMessages();
                // Always scroll to bottom when user sends a message
                setTimeout(() => scrollToBottom(), 100);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Custom Scrollbar Styles */}
            <style jsx>{`
                .trollbox-messages::-webkit-scrollbar {
                    width: 8px;
                }
                .trollbox-messages::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 10px;
                }
                .trollbox-messages::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, rgba(250, 204, 21, 0.6), rgba(250, 204, 21, 0.4));
                    border-radius: 10px;
                    border: 2px solid rgba(0, 0, 0, 0.2);
                }
                .trollbox-messages::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, rgba(250, 204, 21, 0.8), rgba(250, 204, 21, 0.6));
                }
            `}</style>

            {/* Backdrop overlay */}
            <div
                className="fixed inset-0 z-[99] transition-opacity duration-300"
                style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={onClose}
            />

            {/* Trollbox Panel */}
            <div
                className="fixed z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300"
                style={{
                    top: '50%',
                    right: '20px',
                    transform: 'translateY(-50%)',
                    width: 'min(420px, calc(100vw - 40px))',
                    maxHeight: 'min(700px, calc(100vh - 100px))',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 20, 20, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255, 255, 0, 0.4)',
                    borderRadius: '24px',
                    boxShadow: '-10px 10px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255, 255, 0, 0.2), inset 0 0 20px rgba(255, 255, 0, 0.05)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b shrink-0"
                    style={{
                        borderColor: 'rgba(255, 255, 0, 0.2)',
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.3) 100%)',
                        borderTopLeftRadius: '22px',
                        borderTopRightRadius: '22px',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <MessageSquare className="w-6 h-6 text-brand" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.trollbox.title}</h2>
                            <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                                <Users className="w-3 h-3" />
                                <span className="font-semibold">{t.trollbox.usersOnline.replace('{{count}}', onlineCount.toString())}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-red-500/20 rounded-full transition-all hover:rotate-90 border border-transparent hover:border-red-500/30"
                        style={{ transition: 'all 0.3s' }}
                    >
                        <X className="w-5 h-5 text-gray-400 hover:text-red-400" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Messages Area */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="trollbox-messages flex-1 overflow-y-auto p-4 space-y-3"
                    style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 50px)',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(250, 204, 21, 0.5) rgba(0, 0, 0, 0.2)',
                    }}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                            <div className="w-10 h-10 border-3 border-[#FFFF00]/20 border-t-[#FFFF00] rounded-full animate-spin" />
                            <span className="text-sm font-semibold">{t.common.loadingMessages}</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="relative mb-4">
                                <MessageSquare className="w-16 h-16 text-brand/20" />
                                <div className="absolute inset-0 animate-pulse">
                                    <MessageSquare className="w-16 h-16 text-brand/10" />
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">{t.common.itsQuiet}</h3>
                            <p className="text-sm text-gray-400">{t.common.beTheFirst}</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const userColor = msg.is_system ? '#FFFF00' : getUserColor(msg.user_id);
                            const isCurrentUser = currentUser && msg.user_id === currentUser.id;

                            return (
                                <div key={msg.id} className="group flex flex-col gap-1.5 animate-fadeIn">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center border-2 overflow-hidden shadow-lg"
                                                style={{
                                                    borderColor: userColor,
                                                    background: `linear-gradient(135deg, ${userColor}20, ${userColor}10)`,
                                                }}
                                            >
                                                {msg.user?.avatar_url ? (
                                                    <img src={msg.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-3.5 h-3.5" style={{ color: userColor }} />
                                                )}
                                            </div>
                                            <span
                                                className="text-[13px] font-bold"
                                                style={{
                                                    color: userColor,
                                                    textShadow: `0 0 10px ${userColor}40`
                                                }}
                                            >
                                                {msg.user?.username || (msg.user?.wallet_address ? `${msg.user.wallet_address.slice(0, 6)}...${msg.user.wallet_address.slice(-4)}` : 'System')}
                                                {isCurrentUser && (
                                                    <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-brand/20 text-brand">
                                                        {t.common.you}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }).replace('about ', '')}
                                        </span>
                                    </div>
                                    <div
                                        className="text-[14px] p-3 rounded-xl rounded-tl-none break-words leading-relaxed transition-all group-hover:shadow-lg"
                                        style={{
                                            background: msg.is_system
                                                ? 'linear-gradient(135deg, rgba(255, 255, 0, 0.15), rgba(255, 255, 0, 0.05))'
                                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
                                            border: `1px solid ${userColor}30`,
                                            color: msg.is_system ? '#FFF8DC' : '#E5E5E5',
                                            fontStyle: msg.is_system ? 'italic' : 'normal',
                                            boxShadow: `0 2px 8px ${userColor}10`,
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                    <button
                        onClick={() => scrollToBottom()}
                        className="absolute bottom-24 right-8 p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-10 animate-bounce"
                        style={{
                            background: 'linear-gradient(135deg, #FFFF00, #FFD700)',
                            boxShadow: '0 4px 20px rgba(255, 255, 0, 0.5)',
                        }}
                    >
                        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                )}

                {/* Input Area */}
                <div
                    className="p-4 border-t shrink-0"
                    style={{
                        borderColor: 'rgba(255, 255, 0, 0.2)',
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.8) 100%)',
                        borderBottomLeftRadius: '22px',
                        borderBottomRightRadius: '22px',
                    }}
                >
                    {!address ? (
                        <div
                            className="p-4 rounded-xl text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.1), rgba(255, 68, 68, 0.05))',
                                border: '2px solid rgba(255, 68, 68, 0.3)',
                                boxShadow: '0 4px 12px rgba(255, 68, 68, 0.2)',
                            }}
                        >
                            <p className="text-sm text-red-400 font-bold">{t.trollbox.connectWalletChat}</p>
                        </div>
                    ) : !currentUser ? (
                        <div
                            className="p-4 rounded-xl text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.1), rgba(255, 165, 0, 0.05))',
                                border: '2px solid rgba(255, 165, 0, 0.3)',
                                boxShadow: '0 4px 12px rgba(255, 165, 0, 0.2)',
                            }}
                        >
                            <p className="text-sm text-orange-400 font-bold">{t.trollbox.initializingProfile}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={t.common.typeMessage}
                                maxLength={500}
                                className="flex-1 rounded-full px-5 py-3.5 text-sm text-white placeholder-gray-400 focus:outline-none transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
                                    border: '2px solid rgba(255, 255, 0, 0.2)',
                                    boxShadow: isSending ? 'none' : '0 2px 8px rgba(255, 255, 0, 0.1)',
                                }}
                                disabled={isSending}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 0, 0.5)';
                                    e.target.style.boxShadow = '0 4px 16px rgba(255, 255, 0, 0.2)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 0, 0.2)';
                                    e.target.style.boxShadow = '0 2px 8px rgba(255, 255, 0, 0.1)';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="p-3.5 rounded-full text-black disabled:opacity-40 disabled:grayscale transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0 shadow-lg"
                                style={{
                                    background: !newMessage.trim() || isSending
                                        ? 'rgba(100, 100, 100, 0.5)'
                                        : 'linear-gradient(135deg, #FFFF00, #FFD700)',
                                    boxShadow: !newMessage.trim() || isSending
                                        ? 'none'
                                        : '0 4px 16px rgba(255, 255, 0, 0.4)',
                                }}
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 flex-shrink-0" />
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
