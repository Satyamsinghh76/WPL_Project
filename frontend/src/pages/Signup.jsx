import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import * as API from '../api';

export default function Signup({ onLogin }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        full_name: '',
        username: '',
        email: '',
        password: '',
        institution: '',
        bio: '',
        tagline: '',
        skills: [],
        phone_number: '',
        links: [],
    });
    const [skillInput, setSkillInput] = useState('');
    const [newLink, setNewLink] = useState({ type: 'github', url: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Convert links array to dict for backend
            const linksObj = {};
            form.links.forEach(link => {
                linksObj[link.type] = link.url;
            });
            
            const createData = await API.signup({
                username: form.username,
                email: form.email,
                full_name: form.full_name,
                password: form.password,
                institution: form.institution,
                bio: form.bio,
                tagline: form.tagline,
                skills: form.skills,
                phone_number: form.phone_number,
                links: linksObj,
            });

            const loginData = await API.login(form.username, form.password);
            onLogin(loginData);
            navigate('/');
        } catch (err) {
            setError(err?.message || 'Unable to reach backend. Check VITE_API_URL and Render health endpoint.');
        } finally {
            setIsLoading(false);
        }
    };

    const addSkill = () => {
        if (skillInput.trim()) {
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
        <div className="auth-page min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl w-full mx-auto card">
                <h2 className="text-2xl font-bold text-academic-900 mb-4">Join Scholr</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            className="input"
                            type="text"
                            placeholder="Full Name *"
                            value={form.full_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            type="text"
                            placeholder="Username *"
                            value={form.username}
                            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                            required
                        />
                    </div>

                    <input
                        className="input"
                        type="email"
                        placeholder="Email *"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        required
                    />

                    <input
                        className="input"
                        type="password"
                        placeholder="Password *"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        required
                    />

                    <input
                        className="input"
                        type="text"
                        placeholder="Tagline (optional)"
                        value={form.tagline}
                        onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                    />

                    <textarea
                        className="textarea"
                        placeholder="Bio (optional)"
                        rows={3}
                        value={form.bio}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                    />

                    <input
                        className="input"
                        type="text"
                        placeholder="Institution (optional)"
                        value={form.institution}
                        onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
                    />

                    <input
                        className="input"
                        type="tel"
                        placeholder="Phone Number (optional)"
                        value={form.phone_number}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    />

                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-2">Skills (optional)</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="input flex-1"
                                type="text"
                                placeholder="Add a skill (e.g., UI Design)"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                            />
                            <button
                                type="button"
                                onClick={addSkill}
                                className="btn btn-secondary"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.skills.map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="badge badge-primary flex items-center gap-2"
                                >
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => removeSkill(idx)}
                                        className="text-xs hover:opacity-70"
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-2">Links (optional)</label>
                        <select
                            value={newLink.type}
                            onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
                            className="input w-full mb-2"
                        >
                            <option value="github">GitHub</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="website">Website</option>
                            <option value="gscholar">Google Scholar</option>
                            <option value="twitter">Twitter</option>
                            <option value="portfolio">Portfolio</option>
                            <option value="other">Other</option>
                        </select>
                        <div className="flex gap-2 mb-2">
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
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {form.links.map((link, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-academic-50 rounded border border-academic-200">
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

                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <p className="text-sm text-academic-500">New accounts start as unverified. OAuth (Google/LinkedIn) creates verified accounts.</p>
                    <button className="btn btn-primary w-full" type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>
            </div>
        </div>
    );
}
