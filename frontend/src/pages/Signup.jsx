import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_USERS = 'http://localhost:8000/api/accounts/users/';
const API_LOGIN = 'http://localhost:8000/api/accounts/login/';

export default function Signup({ onLogin }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        full_name: '',
        username: '',
        email: '',
        password: '',
        institution: '',
        bio: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const createResponse = await fetch(API_USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    full_name: form.full_name,
                    password: form.password,
                    institution: form.institution,
                    bio: form.bio,
                    role: 'General User',
                }),
            });
            const createData = await createResponse.json();
            if (!createResponse.ok) {
                setError(createData.detail || 'Unable to create account.');
                return;
            }

            const loginResponse = await fetch(API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username, password: form.password }),
            });
            const loginData = await loginResponse.json();
            if (!loginResponse.ok) {
                setError(loginData.detail || 'Account created, but auto login failed.');
                return;
            }

            onLogin(loginData);
            navigate('/');
        } catch {
            setError('Backend server is unavailable. Start Django server and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page min-h-screen flex items-center justify-center p-4">
            <div className="max-w-xl w-full mx-auto card">
                <h2 className="text-2xl font-bold text-academic-900 mb-4">Join Scholr</h2>
                <form onSubmit={handleSignup} className="space-y-3">
                    <input
                        className="input"
                        type="text"
                        placeholder="Full Name"
                        value={form.full_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        required
                    />
                    <input
                        className="input"
                        type="text"
                        placeholder="Username"
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                        required
                    />
                    <input
                        className="input"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        required
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        required
                    />
                    <input
                        className="input"
                        type="text"
                        placeholder="Institution"
                        value={form.institution}
                        onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
                    />
                    <textarea
                        className="textarea"
                        placeholder="Bio"
                        rows={4}
                        value={form.bio}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <p className="text-sm text-academic-500">General User accounts are read-only until role upgrade.</p>
                    <button className="btn btn-primary" type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>
            </div>
        </div>
    );
}
