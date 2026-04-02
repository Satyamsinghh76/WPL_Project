import React, { useEffect, useMemo, useState } from 'react';
import { User, Calendar, Shield, Users, Code, CheckCircle, X, Plus } from 'lucide-react';
import * as API from '../api';

function formatJoinDate(isoTime) {
    if (!isoTime) {
        return 'Unknown';
    }
    return new Date(isoTime).toLocaleDateString();
}

export default function Profile({ currentUser, posts, onUserUpdate }) {
    const [form, setForm] = useState({ 
        full_name: '', 
        institution: '', 
        bio: '',
        tagline: '',
        skills: [],
        phone_number: '',
        links: []
    });
    const [skillInput, setSkillInput] = useState('');
    const [newLink, setNewLink] = useState({ type: 'github', url: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!currentUser) {
            return;
        }
        
        // Convert links object to array format
        let linksArray = [];
        if (typeof currentUser.links === 'object' && currentUser.links) {
            linksArray = Object.entries(currentUser.links)
                .filter(([_, url]) => url)
                .map(([type, url]) => ({ type, url }));
        }
        
        setForm({
            full_name: currentUser.full_name || '',
            institution: currentUser.institution || '',
            bio: currentUser.bio || '',
            tagline: currentUser.tagline || '',
            skills: Array.isArray(currentUser.skills) ? currentUser.skills : (currentUser.skills ? currentUser.skills.split(',').map(s => s.trim()) : []),
            phone_number: currentUser.phone_number || '',
            links: linksArray
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

        try {
            // Convert links array back to object for backend
            const linksObj = {};
            form.links.forEach(link => {
                linksObj[link.type] = link.url;
            });
            
            const payload = {
                ...form,
                skills: form.skills.length > 0 ? form.skills : [],
                links: linksObj
            };
            const data = await API.updateUser(currentUser.id, payload, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            });
            onUserUpdate({ ...currentUser, ...payload });
            setMessage('Profile updated.');
        } catch (error) {
            setMessage('Unable to save profile updates.');
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
            setForm((prev) => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()],
            }));
            setSkillInput('');
        }
    };

    const removeSkill = (index) => {
        setForm((prev) => ({
            ...prev,
            skills: prev.skills.filter((_, i) => i !== index),
        }));
    };

    const addLink = () => {
        if (newLink.url.trim()) {
            setForm((prev) => ({
                ...prev,
                links: [...prev.links, { type: newLink.type, url: newLink.url.trim() }],
            }));
            setNewLink({ type: 'github', url: '' });
        }
    };

    const removeLink = (index) => {
        setForm((prev) => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index),
        }));
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
                        <h2 className="text-2xl font-bold text-academic-900 mb-1">{currentUser.full_name || currentUser.username}</h2>
                        <p className="text-sm text-academic-600 mb-3">@{currentUser.username}</p>
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
                        <label className="block text-sm font-medium text-academic-700 mb-1">Username</label>
                        <input
                            className="input bg-academic-50 cursor-not-allowed"
                            value={currentUser?.username || ''}
                            disabled
                        />
                        <p className="text-xs text-academic-500 mt-1">Username cannot be changed</p>
                    </div>
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
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Tagline (Optional)</label>
                        <input
                            className="input"
                            placeholder="Brief description of yourself"
                            value={form.tagline}
                            onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Phone Number (Optional)</label>
                        <input
                            className="input"
                            placeholder="e.g., +1 (555) 123-4567"
                            value={form.phone_number}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-3">Skills (Optional)</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                className="input"
                                placeholder="Add a skill"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={addSkill}
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.skills.map((skill, index) => (
                                <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => removeSkill(index)}
                                        className="hover:text-primary-900"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-academic-700">Links (Optional)</label>
                        <select
                            value={newLink.type}
                            onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
                            className="input w-full"
                        >
                            <option value="github">GitHub</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="website">Website</option>
                            <option value="gscholar">Google Scholar</option>
                            <option value="twitter">Twitter</option>
                            <option value="portfolio">Portfolio</option>
                            <option value="other">Other</option>
                        </select>
                        <div className="flex gap-2">
                            <input
                                className="input flex-1"
                                type="url"
                                placeholder="https://example.com"
                                value={newLink.url}
                                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                            />
                            <button
                                type="button"
                                onClick={addLink}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.links.map((link, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-academic-50 rounded-lg border border-academic-200">
                                    <div className="flex-1">
                                        <span className="inline-block px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded mr-2">
                                            {link.type.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm truncate">
                                            {link.url}
                                        </a>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLink(index)}
                                        className="ml-2 p-1 hover:bg-red-100 rounded text-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="btn btn-primary" type="submit">
                        Save Profile
                    </button>
                    {message && <p className="text-sm text-academic-700">{message}</p>}
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-1">{myPosts.length}</div>
                    <div className="text-sm text-academic-600">Discussions</div>
                </div>
                <div className="card text-center">
                    <div className="text-lg font-semibold text-academic-900 mb-1">{currentUser.role}</div>
                    <div className="text-sm text-academic-600">{currentUser.role === 'Verified User' || currentUser.role === 'Administrator' || currentUser.role === 'Developer' || currentUser.role === 'Moderator' ? 'Verified' : 'Not Verified'}</div>
                </div>
            </div>
        </div>
    );
}
