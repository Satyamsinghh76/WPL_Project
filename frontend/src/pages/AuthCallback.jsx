import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import * as API from '../api';

export default function AuthCallback({ onLogin }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    setError(sessionError.message);
                    return;
                }

                const accessToken = data?.session?.access_token;
                if (!accessToken) {
                    setError('No session found. Please try logging in again.');
                    return;
                }

                // Exchange the Supabase token for a local AuthToken
                const userData = await API.oauthLogin(accessToken);

                if (!userData.token) {
                    setError('Login succeeded but no token was returned.');
                    return;
                }

                onLogin(userData);
                navigate('/');
            } catch (err) {
                setError(err?.message || 'OAuth login failed. Please try again.');
            }
        };

        handleCallback();
    }, [navigate, onLogin]);

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
