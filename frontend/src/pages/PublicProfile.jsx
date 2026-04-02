import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, Shield, Users, Code, CheckCircle, Mail, Phone, ExternalLink, Flag, MessageSquare } from 'lucide-react';
import * as API from '../api';

function formatJoinDate(isoTime) {
    if (!isoTime) return 'Unknown';
    return new Date(isoTime).toLocaleDateString();
}

function LinkBadge({ name, url }) {
    if (!url) return null;
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-primary-200 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
        >
            {name}
            <ExternalLink className="w-3 h-3" />
        </a>
    );
}

export default function PublicProfile({ posts, currentUser }) {
    const { username } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportMessage, setReportMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError('');
            try {
                const userData = await API.getPublicProfile(username);
                setUser(userData);
            } catch (err) {
                setError(err?.message || 'User not found.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Administrator':
                return <Shield className="w-5 h-5" />;
            case 'Moderator':
                return <Users className="w-5 h-5" />;
            case 'Developer':
                return <Code className="w-5 h-5" />;
            case 'Verified User':
                return <CheckCircle className="w-5 h-5" />;
            default:
                return <User className="w-5 h-5" />;
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Administrator':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'Moderator':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'Developer':
                return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'Verified User':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const userPosts = useMemo(() => {
        if (!user || !posts) return [];
        return posts.filter((post) => post.author_id === user.id);
    }, [posts, user]);

    if (isLoading) {
        return <div className="card text-center py-8 text-academic-600">Loading profile...</div>;
    }

    if (error) {
        return (
            <div className="card text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">
                    Back to Home
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="card text-center py-8">
                <p className="text-academic-600 mb-4">User not found.</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">
                    Back to Home
                </button>
            </div>
        );
    }

    const links = user.links || {};
    const canReport = Boolean(currentUser && (currentUser.acting_role || currentUser.role) !== 'General User');
    const canMessage = Boolean(currentUser && currentUser.id !== user?.id);

    const handleMessage = async () => {
        if (!canMessage) return;
        try {
            await API.startConversation(user.id, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            });
            // The ChatWidget will pick up the new conversation on next poll
            alert('Conversation started! Check the Messaging widget at the bottom right.');
        } catch (err) {
            alert(err?.message || 'Failed to start conversation.');
        }
    };

    const handleReportUser = async (e) => {
        e.preventDefault();
        if (!canReport) {
            setReportMessage('Only verified users can submit reports.');
            return;
        }

        const reason = reportReason.trim();
        if (!reason) {
            setReportMessage('Please describe why you are reporting this account.');
            return;
        }

        try {
            await API.reportUser(user.id, { reason }, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            });
            setReportReason('');
            setShowReportForm(false);
            setReportMessage('Report submitted.');
        } catch (err) {
            setReportMessage(err?.message || 'Unable to submit report.');
        }
    };

    return (
        <div className="profile-page max-w-4xl mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="btn btn-ghost text-sm mb-4">
                ← Back
            </button>

            <div className="card">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    {user?.profile_picture ? (
                        <img
                            src={user.profile_picture}
                            alt={user.full_name}
                            className="w-24 h-24 rounded-full object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                            <User className="w-12 h-12 text-white" />
                        </div>
                    )}

                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-academic-900 mb-2">{user.full_name}</h1>
                        <p className="text-lg text-primary-600 font-medium mb-3">@{user.username}</p>

                        {user.tagline && <p className="text-lg text-academic-700 italic mb-3">{user.tagline}</p>}

                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                                {getRoleIcon(user.role)}
                                <span className="font-medium">{user.role}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-academic-600">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">Joined {formatJoinDate(user.created_at)}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {canMessage && (
                                <button
                                    onClick={handleMessage}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-primary-200 text-sm text-primary-600 hover:bg-primary-50 font-medium"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Message
                                </button>
                            )}
                            {user.email && (
                                <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                                    <Mail className="w-4 h-4" />
                                    Contact
                                </a>
                            )}
                            {user.phone_number && (
                                <a href={`tel:${user.phone_number}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                                    <Phone className="w-4 h-4" />
                                    {user.phone_number}
                                </a>
                            )}
                            {canReport && (
                                <button
                                    type="button"
                                    onClick={() => setShowReportForm((prev) => !prev)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-amber-200 text-sm text-amber-700 hover:bg-amber-50"
                                >
                                    <Flag className="w-4 h-4" />
                                    Report account
                                </button>
                            )}
                        </div>

                        {Object.entries(links).some(([_, url]) => url) && (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(links).map(([type, url]) => 
                                    url ? <LinkBadge key={type} name={type.replace('_', ' ').toUpperCase()} url={url} /> : null
                                )}
                            </div>
                        )}

                        {showReportForm && canReport && (
                            <form onSubmit={handleReportUser} className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <label className="block text-sm font-medium text-academic-800">Why are you reporting this account?</label>
                                <textarea
                                    rows={4}
                                    className="textarea"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Describe the issue..."
                                />
                                <div className="flex items-center gap-3">
                                    <button type="submit" className="btn btn-primary">Submit report</button>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowReportForm(false)}>Cancel</button>
                                </div>
                            </form>
                        )}
                        {reportMessage && <div className="text-sm text-academic-700 mt-3">{reportMessage}</div>}
                    </div>
                </div>
            </div>

            {user.bio && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-academic-900 mb-3">About</h3>
                    <p className="text-academic-700 whitespace-pre-wrap">{user.bio}</p>
                </div>
            )}

            {user.institution && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-academic-900 mb-2">Institution</h3>
                    <p className="text-academic-700">{user.institution}</p>
                </div>
            )}

            {user.skills && user.skills.length > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-academic-900 mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, idx) => (
                            <span key={idx} className="badge badge-primary">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="card">
                <h3 className="text-lg font-semibold text-academic-900 mb-4">Posts ({userPosts.length})</h3>
                {userPosts.length === 0 ? (
                    <p className="text-academic-600">No posts yet.</p>
                ) : (
                    <div className="space-y-3">
                        {userPosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => navigate(`/post/${post.id}`)}
                                className="p-3 border border-academic-200 rounded-lg hover:bg-academic-50 cursor-pointer transition-colors"
                            >
                                <h4 className="font-medium text-academic-900">{post.title}</h4>
                                <p className="text-sm text-academic-600 mt-1 line-clamp-2">{post.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
