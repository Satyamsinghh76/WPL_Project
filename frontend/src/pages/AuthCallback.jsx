import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, Lock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import * as API from '../api';

export default function AuthCallback({ onLogin }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                if (!isSupabaseConfigured || !supabase) {
                    setError('Supabase is not configured for this environment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use OAuth.');
                    return;
                }

                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    setError(sessionError.message);
                    setIsLoading(false);
                    return;
                }

                const accessToken = data?.session?.access_token;
                if (!accessToken) {
                    setError('No session found. Please try logging in again.');
                    setIsLoading(false);
                    return;
                }

                setAccessToken(accessToken);

                const userData = await API.oauthLogin(accessToken);

                if (userData.requires_password) {
                    setNeedsPassword(true);
                    setIsLoading(false);
                    return;
                }

                if (!userData.token) {
                    setError('Login succeeded but no token was returned.');
                    setIsLoading(false);
                    return;
                }

                onLogin(userData);
                navigate('/');
            } catch (err) {
                setError(err?.message || 'OAuth login failed. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        handleCallback();
    }, [navigate, onLogin]);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!accessToken) {
            setError('Missing OAuth session. Please try logging in again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const userData = await API.oauthLogin(accessToken, password);
            if (!userData.token) {
                setError('Password was saved but no token was returned.');
                return;
            }

            onLogin(userData);
            navigate('/');
        } catch (err) {
            setError(err?.message || 'Unable to complete login.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card bg-white shadow-xl max-w-md w-full p-8 text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-red-600">
                        <AlertCircle className="w-6 h-6" />
                        <span className="font-semibold">Login Failed</span>
                    </div>
                    <p className="text-sm text-academic-600">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn btn-primary"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (needsPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card bg-white shadow-xl max-w-md w-full p-8 space-y-5">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-academic-900">Set your password</h1>
                        <p className="text-sm text-academic-600">
                            Google and LinkedIn logins need a local password before the account is activated.
                        </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Confirm password</label>
                            <input
                                type="password"
                                className="input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving password...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card bg-white shadow-xl max-w-md w-full p-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto animate-pulse">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-academic-600 font-medium">Completing login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card bg-white shadow-xl max-w-md w-full p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto animate-pulse">
                    <Sparkles className="w-7 h-7 text-white" />
                </div>
                <p className="text-academic-600 font-medium">Completing login...</p>
            </div>
        </div>
    );
}
