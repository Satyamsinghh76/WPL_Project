import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, ChevronUp, ChevronDown, Send, ArrowLeft, User, Users, Hash, Plus } from 'lucide-react';
import * as API from '../api';

const POLL_INTERVAL = 4000;
const TABS = [
    { key: 'direct', label: 'DMs', icon: MessageSquare },
    { key: 'group', label: 'Groups', icon: Users },
    { key: 'topic', label: 'Topics', icon: Hash },
];

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

export default function ChatWidget({ currentUser, authHeaders }) {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState('direct');
    const [conversations, setConversations] = useState([]);
    const [topicRooms, setTopicRooms] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [sending, setSending] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const headers = useCallback(() => authHeaders(true), [authHeaders]);

    const fetchConversations = useCallback(async () => {
        if (!currentUser?.token) return;
        try {
            const data = await API.getConversations(headers());
            setConversations(data.results || []);
            const total = (data.results || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
            setUnreadTotal(total);
        } catch { /* ignore */ }
    }, [currentUser?.token, headers]);

    const fetchTopicRooms = useCallback(async () => {
        if (!currentUser?.token) return;
        try {
            const data = await API.getTopicRooms(headers());
            setTopicRooms(data.results || []);
        } catch { /* ignore */ }
    }, [currentUser?.token, headers]);

    const fetchMessages = useCallback(async () => {
        if (!activeConvo || !currentUser?.token) return;
        try {
            const data = await API.getMessages(activeConvo.id, headers());
            setMessages(data.results || []);
        } catch { /* ignore */ }
    }, [activeConvo, currentUser?.token, headers]);

    // Poll conversations
    useEffect(() => {
        if (!currentUser?.token || !isOpen) return;
        fetchConversations();
        fetchTopicRooms();
        const interval = setInterval(() => {
            fetchConversations();
            if (tab === 'topic') fetchTopicRooms();
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser?.token, isOpen, tab, fetchConversations, fetchTopicRooms]);

    // Poll unread even when closed
    useEffect(() => {
        if (!currentUser?.token) return;
        const fetchUnread = async () => {
            try {
                const data = await API.getUnreadCount(headers());
                setUnreadTotal(data.unread_count || 0);
            } catch { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser?.token, headers]);

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

    const handleJoinTopic = async (topicId) => {
        try {
            const convo = await API.joinTopicRoom(topicId, headers());
            setActiveConvo(convo);
            setMessages([]);
            fetchTopicRooms();
        } catch { /* ignore */ }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupName.trim() || selectedMembers.length === 0) return;
        try {
            const convo = await API.createGroupChat(groupName.trim(), selectedMembers, headers());
            setShowNewGroup(false);
            setGroupName('');
            setSelectedMembers([]);
            setActiveConvo(convo);
            setMessages([]);
            fetchConversations();
        } catch { /* ignore */ }
    };

    const loadUsers = async () => {
        try {
            const data = await API.getUsers(headers());
            setAllUsers((data.results || []).filter((u) => u.id !== currentUser.id && u.is_active));
        } catch { /* ignore */ }
    };

    const filteredConvos = conversations.filter((c) => c.conv_type === tab);

    if (!currentUser) return null;

    const convoTitle = activeConvo
        ? activeConvo.conv_type === 'direct'
            ? activeConvo.other_user?.full_name || activeConvo.other_user?.username || 'Chat'
            : activeConvo.name || 'Chat'
        : '';

    const convoAvatar = activeConvo?.conv_type === 'direct' ? activeConvo.other_user?.profile_picture : null;

    return (
        <div className="fixed bottom-0 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="w-96 h-[30rem] bg-white rounded-t-xl shadow-2xl border border-academic-200 flex flex-col overflow-hidden">
                    {activeConvo ? (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
                                <button onClick={backToList} className="p-1 hover:bg-white/20 rounded">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                {activeConvo.conv_type === 'direct' ? (
                                    <Avatar src={convoAvatar} name={convoTitle} size={7} />
                                ) : activeConvo.conv_type === 'topic' ? (
                                    <Hash className="w-5 h-5" />
                                ) : (
                                    <Users className="w-5 h-5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{convoTitle}</div>
                                    {activeConvo.conv_type !== 'direct' && (
                                        <div className="text-[10px] text-primary-200">{activeConvo.member_count} members</div>
                                    )}
                                </div>
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
                                            {!isMine && activeConvo.conv_type !== 'direct' && (
                                                <Avatar src={msg.sender_picture} name={msg.sender_username} size={6} />
                                            )}
                                            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                                                isMine
                                                    ? 'bg-primary-600 text-white rounded-br-md'
                                                    : 'bg-white text-academic-800 border border-academic-200 rounded-bl-md'
                                            }`}>
                                                {!isMine && activeConvo.conv_type !== 'direct' && (
                                                    <div className="text-[10px] font-semibold mb-0.5 text-primary-600">{msg.sender_username}</div>
                                                )}
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
                    ) : showNewGroup ? (
                        /* New Group Form */
                        <>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
                                <button onClick={() => setShowNewGroup(false)} className="p-1 hover:bg-white/20 rounded">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <span className="font-semibold text-sm">New Group Chat</span>
                                <div className="w-6" />
                            </div>
                            <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-3">
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Group name"
                                    className="w-full text-sm px-3 py-2 border border-academic-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    required
                                />
                                <div className="text-xs font-semibold text-academic-500 uppercase">Select members</div>
                                <div className="space-y-1 max-h-52 overflow-y-auto">
                                    {allUsers.map((u) => (
                                        <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-academic-50 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.includes(u.id)}
                                                onChange={(e) => {
                                                    setSelectedMembers((prev) =>
                                                        e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                                                    );
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-academic-800">{u.full_name || u.username}</span>
                                            <span className="text-academic-400 text-xs">@{u.username}</span>
                                        </label>
                                    ))}
                                    {allUsers.length === 0 && <div className="text-sm text-academic-400 text-center py-4">Loading users...</div>}
                                </div>
                                <button type="submit" disabled={!groupName.trim() || selectedMembers.length === 0}
                                    className="btn btn-primary w-full text-sm">
                                    Create Group
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Conversations List with Tabs */
                        <>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex-shrink-0">
                                <span className="font-semibold text-sm">Messaging</span>
                                {tab === 'group' && (
                                    <button onClick={() => { setShowNewGroup(true); loadUsers(); }}
                                        className="p-1 hover:bg-white/20 rounded" title="New group">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-academic-200 flex-shrink-0">
                                {TABS.map((t) => {
                                    const Icon = t.icon;
                                    const count = t.key === 'topic' ? 0 :
                                        conversations.filter((c) => c.conv_type === t.key).reduce((s, c) => s + (c.unread_count || 0), 0);
                                    return (
                                        <button
                                            key={t.key}
                                            onClick={() => setTab(t.key)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                                                tab === t.key
                                                    ? 'text-primary-600 border-b-2 border-primary-600'
                                                    : 'text-academic-500 hover:text-academic-700'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {t.label}
                                            {count > 0 && (
                                                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {tab === 'topic' ? (
                                    /* Topic Rooms */
                                    topicRooms.length === 0 ? (
                                        <div className="text-center text-sm text-academic-400 mt-12">No topic rooms yet.</div>
                                    ) : (
                                        topicRooms.map((room) => (
                                            <button
                                                key={room.id}
                                                onClick={() => room.joined ? openChat({ id: room.id, conv_type: 'topic', name: room.topic_name || room.name, member_count: room.member_count }) : handleJoinTopic(room.topic_id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-academic-50 transition-colors text-left border-b border-academic-100"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                    <Hash className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-academic-800 truncate">{room.topic_name || room.name}</div>
                                                    <div className="text-xs text-academic-500">{room.member_count} members</div>
                                                </div>
                                                {!room.joined && (
                                                    <span className="text-xs text-primary-600 font-medium px-2 py-1 rounded bg-primary-50">Join</span>
                                                )}
                                            </button>
                                        ))
                                    )
                                ) : (
                                    /* DMs and Groups */
                                    filteredConvos.length === 0 ? (
                                        <div className="text-center text-sm text-academic-400 mt-12">
                                            {tab === 'direct' ? 'No conversations yet.\nVisit a profile to start chatting.' : 'No group chats yet.\nClick + to create one.'}
                                        </div>
                                    ) : (
                                        filteredConvos.map((convo) => {
                                            const displayName = convo.conv_type === 'direct'
                                                ? (convo.other_user?.full_name || convo.other_user?.username || 'Unknown')
                                                : convo.name;
                                            const pic = convo.conv_type === 'direct' ? convo.other_user?.profile_picture : null;
                                            return (
                                                <button
                                                    key={convo.id}
                                                    onClick={() => openChat(convo)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-academic-50 transition-colors text-left border-b border-academic-100"
                                                >
                                                    {convo.conv_type === 'direct' ? (
                                                        <Avatar src={pic} name={displayName} size={10} />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <Users className="w-5 h-5 text-purple-600" />
                                                        </div>
                                                    )}
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
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Bottom Bar Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-lg shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all"
            >
                {currentUser.profile_picture ? (
                    <img src={currentUser.profile_picture} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                    <MessageSquare className="w-5 h-5" />
                )}
                <span className="text-sm font-semibold">Messaging</span>
                {unreadTotal > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {unreadTotal}
                    </span>
                )}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
        </div>
    );
}
