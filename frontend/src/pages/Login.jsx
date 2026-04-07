import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Linkedin, Lock, Sparkles, User } from 'lucide-react';
import * as API from '../api';
import { supabase, isSupabaseConfigured } from '../supabase';

const linkedinUrl = 'https://www.linkedin.com/company/scholr-satyam-gitaansh';

const infoCards = [
    {
        title: 'What is Scholr',
        body: 'A focused academic network for students, researchers, and creators who want discussion to feel useful instead of noisy.',
    },
    {
        title: 'Why Scholr',
        body: 'To keep knowledge-sharing practical, searchable, and collaborative so people can find signal faster.',
    },
    {
        title: 'Mission',
        body: 'Undo brain rot by rewarding thoughtful posts, clear evidence, and healthy debate over empty engagement.',
    },
];

const extraRows = [
    {
        title: 'Follow us',
        href: linkedinUrl,
    },
    {
        title: 'Contact us',
        emails: ['gitaanshbhuradia008@gmail.com', 'satyamsinghlko48@gmail.com'],
    },
];

export default function Login({ onLogin }) {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState('');

    const handleOAuth = async (provider) => {
        setError('');
        if (!isSupabaseConfigured || !supabase) {
            return;
        }
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

    const submitLogin = async (loginIdentifier, loginPassword) => {
        setError('');
        setIsLoading(true);
        try {
            const data = await API.login(loginIdentifier, loginPassword);
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
        await submitLogin(identifier, password);
    };

    return (
        <div className="auth-page min-h-screen px-4 py-6 md:px-8">
            <div className="max-w-7xl mx-auto space-y-10">
                <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
                    <div className="relative overflow-hidden p-8 md:p-10 min-h-[30rem]">
                        <div className="relative h-full flex flex-col justify-between gap-8">
                            <div className="space-y-8 max-w-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center border border-primary-500/30">
                                        <Sparkles className="w-7 h-7 text-primary-500" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold text-academic-900">Scholr</h1>
                                        <p className="text-sm text-academic-600">Academic discourse, without the noise.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-4xl md:text-5xl font-bold leading-tight text-academic-900">A place to share useful ideas, not endless distractions.</h2>
                                    <p className="text-lg text-academic-600 max-w-xl">
                                        Scholr is built for people who want evidence, context, and thoughtful discussion to stay visible.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="card bg-white shadow-2xl border border-academic-200">
                            <div className="p-8 md:p-10">
                                <div className="text-left mb-6 space-y-2">
                                    <h3 className="text-3xl font-bold text-academic-900">Sign In</h3>
                                    <p className="text-sm text-academic-600">Use your Scholr account to continue.</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-academic-700 mb-1">Username or Email</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-academic-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Enter username or email"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
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

                                    <div className="text-right">
                                        <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                                            Forgot password?
                                        </Link>
                                    </div>
                                </form>

                                <div className="my-6 text-center text-sm text-academic-500">
                                    <span>or continue with</span>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleOAuth('google')}
                                        disabled={!!oauthLoading || !isSupabaseConfigured}
                                        className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 border border-academic-200 rounded-lg text-academic-700 hover:bg-academic-50 transition-colors disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                        <span className="text-sm font-medium">
                                            {oauthLoading === 'google' ? 'Redirecting...' : 'Login with Google'}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleOAuth('linkedin_oidc')}
                                        disabled={!!oauthLoading || !isSupabaseConfigured}
                                        className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 border border-academic-200 rounded-lg text-academic-700 hover:bg-academic-50 transition-colors disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                        <span className="text-sm font-medium">
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
                    </div>
                </section>

                <section className="space-y-2">
                    {infoCards.map((card) => {
                        return (
                            <div key={card.title} className="w-full py-5 md:py-6 text-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                                    <p className="mt-1 text-sm md:text-base text-gray-700 max-w-4xl mx-auto">{card.body}</p>
                                </div>
                            </div>
                        );
                    })}

                    {extraRows.map((row) => {
                        return (
                            <div key={row.title} className="w-full py-5 md:py-6 text-center">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{row.title}</h3>
                                    {row.href ? (
                                        <a
                                            href={row.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label="LinkedIn"
                                            className="inline-flex items-center justify-center text-blue-700 hover:text-blue-800"
                                        >
                                            <Linkedin className="w-6 h-6" />
                                        </a>
                                    ) : (
                                        <div className="space-y-1 text-center">
                                            {row.emails.map((email) => (
                                                <a key={email} href={`mailto:${email}`} className="block text-sm md:text-base text-gray-800 hover:text-black underline underline-offset-4">
                                                    {email}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        </div>
    );
}
