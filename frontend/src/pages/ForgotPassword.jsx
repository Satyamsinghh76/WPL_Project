import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import * as API from '../api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await API.forgotPassword(email.trim());
            setSent(true);
        } catch (err) {
            setError(err?.message || 'Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card bg-white shadow-xl max-w-md w-full p-8">
                {sent ? (
                    <div className="text-center space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-academic-900">Email sent</h2>
                        <p className="text-academic-600">
                            A password reset link was sent to <strong>{email}</strong>.
                        </p>
                        <Link to="/login" className="btn btn-primary inline-block">Back to Login</Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-academic-900">Forgot Password</h2>
                            <p className="text-sm text-academic-600 mt-1">Enter your email and we'll send a reset link.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-academic-400 w-4 h-4" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
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
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> Back to Login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
