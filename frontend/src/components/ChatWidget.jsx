import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, ArrowLeft, User } from 'lucide-react';
import * as API from '../api';

const POLL_INTERVAL = 4000;

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

function Avatar({ src, name, size = 10 }) {
    if (src) {
        return <img src={src} alt="" className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
    }
    return (
        <div className={`w-${size} h-${size} rounded-full bg-academic-200 flex items-center justify-center flex-shrink-0`}>
            <User className={`w-${size > 8 ? 5 : 4} h-${size > 8 ? 5 : 4} text-academic-500`} />
        </div>
    );
}

export default function ChatWidget({
    currentUser,
    authHeaders,
    onAuthExpired,
    pageMode = false,
    forceOpen = false,
    hideLauncher = false,
    initialConversation = null,
    initialRecipientId = null,
}) {
    const [isOpen, setIsOpen] = useState(Boolean(forceOpen));
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [sending, setSending] = useState(false);
    const [authInvalid, setAuthInvalid] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const headers = useCallback(() => authHeaders(true), [authHeaders]);

    const handleAuthError = useCallback((err) => {
        const message = err?.message || '';
        if (message.includes('Authentication required') || message.includes('401')) {
            setAuthInvalid(true);
            setUnreadTotal(0);
            if (onAuthExpired) {
                onAuthExpired();
            }
        }
    }, [onAuthExpired]);

    const fetchConversations = useCallback(async () => {
        if (!currentUser?.token || authInvalid) return;
        try {
            const data = await API.getConversations(headers());
            setConversations(data.results || []);
            const total = (data.results || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
            setUnreadTotal(total);
        } catch (err) {
            handleAuthError(err);
        }
    }, [currentUser?.token, authInvalid, headers, handleAuthError]);

    const fetchMessages = useCallback(async () => {
        if (!activeConvo || !currentUser?.token || authInvalid) return;
        try {
            const data = await API.getMessages(activeConvo.id, headers());
            setMessages(data.results || []);
        } catch (err) {
            handleAuthError(err);
        }
    }, [activeConvo, currentUser?.token, authInvalid, headers, handleAuthError]);

    // Poll conversations
    useEffect(() => {
        if (!currentUser?.token || (!isOpen && !forceOpen) || authInvalid) return;
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser?.token, isOpen, forceOpen, authInvalid, fetchConversations]);

    // Poll unread even when closed
    useEffect(() => {
        if (!currentUser?.token || authInvalid) return;
        const fetchUnread = async () => {
            try {
                const data = await API.getUnreadCount(headers());
                setUnreadTotal(data.unread_count || 0);
            } catch (err) {
                handleAuthError(err);
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser?.token, authInvalid, headers, handleAuthError]);

    // Poll messages
    useEffect(() => {
        if (!activeConvo) return;
        fetchMessages();
        const interval = setInterval(fetchMessages, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [activeConvo, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (activeConvo) setTimeout(() => inputRef.current?.focus(), 100);
    }, [activeConvo]);

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            return;
        }

        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('scholr:open-chat', handleOpenChat);
        return () => window.removeEventListener('scholr:open-chat', handleOpenChat);
    }, [forceOpen]);

    useEffect(() => {
        if (!initialConversation?.id) return;
        setIsOpen(true);
        setActiveConvo(initialConversation);
        setMessages([]);
    }, [initialConversation]);

    useEffect(() => {
        if (!initialRecipientId || activeConvo) return;
        const targetId = Number(initialRecipientId);
        if (!Number.isFinite(targetId)) return;
        const convo = conversations.find((item) => item?.conv_type === 'direct' && Number(item?.other_user?.id) === targetId);
        if (convo) {
            setIsOpen(true);
            setActiveConvo(convo);
            setMessages([]);
        }
    }, [initialRecipientId, activeConvo, conversations]);

    const handleSend = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || !activeConvo || sending) return;
        setSending(true);
        try {
            const msg = await API.sendMessage(activeConvo.id, content, headers());
            setMessages((prev) => [...prev, msg]);
            setNewMessage('');
            fetchConversations();
        } catch { /* ignore */ }
        setSending(false);
    };

    const openChat = (convo) => {
        setActiveConvo(convo);
        setMessages([]);
    };

    const backToList = () => {
        setActiveConvo(null);
        setMessages([]);
        fetchConversations();
    };

    const filteredConvos = conversations.filter((c) => c.conv_type === 'direct');

    if (!currentUser) return null;

    const convoTitle = activeConvo
        ? activeConvo.other_user?.full_name || activeConvo.other_user?.username || 'Chat'
        : '';

    const convoAvatar = activeConvo?.conv_type === 'direct' ? activeConvo.other_user?.profile_picture : null;

    const showPanel = forceOpen || isOpen;
    const panelClassName = pageMode
        ? 'w-full h-full bg-white flex flex-col overflow-hidden'
        : 'fixed inset-x-0 top-0 bottom-16 md:inset-auto md:bottom-0 md:right-2 md:sm:right-6 md:w-96 md:h-[30rem] bg-white md:rounded-t-xl shadow-2xl border border-academic-200 flex flex-col overflow-hidden';

    return (
        <div className={pageMode ? 'h-full' : 'z-50'}>
            {showPanel && (
                <div className={panelClassName}>
                    {activeConvo ? (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
                                <button onClick={backToList} className="p-1 hover:bg-white/20 rounded">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <Avatar src={convoAvatar} name={convoTitle} size={7} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{convoTitle}</div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded md:hidden" title="Close messages">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-academic-50">
                                {messages.length === 0 && (
                                    <div className="text-center text-sm text-academic-400 mt-8">No messages yet. Say hello!</div>
                                )}
                                {messages.map((msg) => {
                                    const isMine = msg.sender_id === currentUser.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-1.5`}>
                                            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                                                isMine
                                                    ? 'bg-primary-600 text-white rounded-br-md'
                                                    : 'bg-white text-academic-800 border border-academic-200 rounded-bl-md'
                                            }`}>
                                                <div className="break-words">{msg.content}</div>
                                                <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-200' : 'text-academic-400'}`}>
                                                    {timeAgo(msg.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 border-t border-academic-200 bg-white flex-shrink-0">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Write a message..."
                                    className="flex-1 text-sm px-3 py-1.5 border border-academic-200 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                                />
                                <button type="submit" disabled={!newMessage.trim() || sending}
                                    className="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Conversations List */
                        <>
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-academic-200 flex-shrink-0">
                                <MessageSquare className="w-4 h-4 text-primary-600" />
                                <span className="text-sm font-semibold text-academic-800">Direct Messages</span>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {filteredConvos.length === 0 ? (
                                    <div className="text-center text-sm text-academic-400 mt-12">
                                        No conversations yet.\nVisit a profile to start chatting.
                                    </div>
                                ) : (
                                    filteredConvos.map((convo) => {
                                        const displayName = convo.other_user?.full_name || convo.other_user?.username || 'Unknown';
                                        const pic = convo.other_user?.profile_picture;
                                        return (
                                            <button
                                                key={convo.id}
                                                onClick={() => openChat(convo)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-academic-50 transition-colors text-left border-b border-academic-100"
                                            >
                                                <Avatar src={pic} name={displayName} size={10} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm truncate ${convo.unread_count > 0 ? 'font-bold text-academic-900' : 'font-medium text-academic-700'}`}>
                                                            {displayName}
                                                        </span>
                                                        <span className="text-[10px] text-academic-400 flex-shrink-0 ml-2">
                                                            {timeAgo(convo.last_message?.created_at)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-xs truncate ${convo.unread_count > 0 ? 'font-semibold text-academic-700' : 'text-academic-500'}`}>
                                                            {convo.last_message
                                                                ? (convo.last_message.sender_id === currentUser.id ? 'You: ' : '') + convo.last_message.content
                                                                : 'No messages yet'}
                                                        </p>
                                                        {convo.unread_count > 0 && (
                                                            <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
                                                                {convo.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
}
