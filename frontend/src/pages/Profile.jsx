import React, { useEffect, useMemo, useState } from 'react';
import { User, Calendar, Shield, Users, Code, CheckCircle } from 'lucide-react';

const API_USERS = 'http://localhost:8000/api/accounts/users/';

function formatJoinDate(isoTime) {
    if (!isoTime) {
        return 'Unknown';
    }
    return new Date(isoTime).toLocaleDateString();
}

export default function Profile({ currentUser, posts, onUserUpdate }) {
    const [form, setForm] = useState({ full_name: '', institution: '', bio: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!currentUser) {
            return;
        }
        setForm({
            full_name: currentUser.full_name || '',
            institution: currentUser.institution || '',
            bio: currentUser.bio || '',
        });
    }, [currentUser]);

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Administrator':
                return <Shield className="w-6 h-6" />;
            case 'Moderator':
                return <Users className="w-6 h-6" />;
            case 'Developer':
                return <Code className="w-6 h-6" />;
            case 'Verified User':
                return <CheckCircle className="w-6 h-6" />;
            default:
                return <User className="w-6 h-6" />;
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

    const myPosts = useMemo(() => {
        if (!currentUser) {
            return [];
        }
        return posts.filter((post) => post.author_id === currentUser.id);
    }, [posts, currentUser]);

    if (!currentUser) {
        return <div className="card text-academic-700">Please log in to view your profile.</div>;
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setMessage('');

        const response = await fetch(`${API_USERS}${currentUser.id}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            },
            body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) {
            setMessage(data.detail || 'Unable to save profile updates.');
            return;
        }

        onUserUpdate({ ...currentUser, ...form });
        setMessage('Profile updated.');
    };

    return (
        <div className="profile-page max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-academic-900">Profile</h1>
            </div>

            <div className="card">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-12 h-12 text-white" />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-academic-900 mb-2">{currentUser.full_name || currentUser.username}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getRoleColor(currentUser.role)}`}>
                                {getRoleIcon(currentUser.role)}
                                <span className="font-medium">{currentUser.role}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-academic-600">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">Joined {formatJoinDate(currentUser.created_at)}</span>
                            </div>
                        </div>
                        <p className="text-academic-600">{currentUser.email}</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className="text-xl font-semibold text-academic-900 mb-4">Edit Profile</h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Full Name</label>
                        <input
                            className="input"
                            value={form.full_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Institution</label>
                        <input
                            className="input"
                            value={form.institution}
                            onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Bio</label>
                        <textarea
                            className="textarea"
                            rows={4}
                            value={form.bio}
                            onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        />
                    </div>
                    <button className="btn btn-primary" type="submit">
                        Save Profile
                    </button>
                    {message && <p className="text-sm text-academic-700">{message}</p>}
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-1">{myPosts.length}</div>
                    <div className="text-sm text-academic-600">Discussions</div>
                </div>
                <div className="card text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-1">{myPosts.reduce((sum, post) => sum + (post.score || 0), 0)}</div>
                    <div className="text-sm text-academic-600">Total Score</div>
                </div>
                <div className="card text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-1">{currentUser.role === 'General User' ? 'Read-only' : 'Can Post'}</div>
                    <div className="text-sm text-academic-600">Permission</div>
                </div>
            </div>
        </div>
    );
}
