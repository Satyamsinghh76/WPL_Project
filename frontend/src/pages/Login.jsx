import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, User, Lock, AlertCircle } from 'lucide-react';
import * as API from '../api';
import { supabase } from '../supabase';

const QUICK_LOGINS = [
    { username: 'admin', password: 'admin', role: 'Administrator' },
    { username: 'dev', password: 'dev', role: 'Developer' },
    { username: 'mod', password: 'mod', role: 'Moderator' },
    { username: 'userV', password: 'userV', role: 'Verified User' },
    { username: 'user', password: 'user', role: 'General User' },
];

export default function Login({ onLogin }) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState('');

    const handleOAuth = async (provider) => {
        setError('');
        setOauthLoading(provider);
        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (oauthError) {
                setError(oauthError.message);
                setOauthLoading('');
            }
        } catch (err) {
            setError(err?.message || `Failed to start ${provider} login.`);
            setOauthLoading('');
        }
    };

    const submitLogin = async (loginUsername, loginPassword) => {
        setError('');
        setIsLoading(true);
        try {
            const data = await API.login(loginUsername, loginPassword);
            if (!data.token) {
                setError('Login succeeded but no token was returned.');
                return;
            }
            onLogin(data);
            navigate('/');
        } catch (err) {
            setError(err?.message || 'Unable to reach backend. Check VITE_API_URL and Render health endpoint.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        await submitLogin(username, password);
    };

    return (
        <div className="auth-page min-h-screen flex items-center justify-center p-4">
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="text-center lg:text-left space-y-6">
                    <div className="flex items-center justify-center lg:justify-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gradient">Scholr</h1>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-bold text-academic-900">Welcome back to the academic community</h2>
                        <p className="text-lg text-academic-600">Sign in using an existing account from backend records.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card bg-white shadow-xl">
                        <div className="p-8">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-academic-900">Sign In</h3>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-academic-700 mb-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-academic-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Enter username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="input pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-academic-700 mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-academic-400 w-4 h-4" />
                                        <input
                                            type="password"
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                        <span className="text-sm text-red-700">{error}</span>
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-academic-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-academic-500">or continue with</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleOAuth('google')}
                                    disabled={!!oauthLoading}
                                    className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 border border-academic-200 rounded-lg hover:bg-academic-50 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span className="text-sm font-medium text-academic-700">
                                        {oauthLoading === 'google' ? 'Redirecting...' : 'Login with Google'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleOAuth('linkedin_oidc')}
                                    disabled={!!oauthLoading}
                                    className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 border border-academic-200 rounded-lg hover:bg-academic-50 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                    <span className="text-sm font-medium text-academic-700">
                                        {oauthLoading === 'linkedin_oidc' ? 'Redirecting...' : 'Login with LinkedIn'}
                                    </span>
                                </button>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-academic-600">
                                    Do not have an account?{' '}
                                    <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-white shadow-lg">
                        <div className="p-6">
                            <h4 className="text-lg font-semibold text-academic-900 mb-4 text-center">Quick Login</h4>
                            <div className="space-y-2">
                                {QUICK_LOGINS.map((cred) => (
                                    <button
                                        key={cred.username}
                                        onClick={() => submitLogin(cred.username, cred.password)}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border border-academic-200 hover:border-academic-300 hover:bg-academic-50 transition-all duration-200"
                                    >
                                        <div className="text-left">
                                            <div className="font-medium text-academic-900">{cred.role}</div>
                                            <div className="text-xs text-academic-600">{cred.username} / {cred.password}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
