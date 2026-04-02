import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Users, ChevronDown } from 'lucide-react';
import * as API from '../api';

const ROLE_OPTIONS = [
    'Administrator',
    'Developer',
    'Moderator',
    'Verified User',
    'General User',
];

export default function AdminUsers({ currentUser, onUserUpdate }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingUserId, setSavingUserId] = useState(null);

    useEffect(() => {
        const loadUsers = async () => {
            if (!currentUser?.token) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                const data = await API.getUsers({
                    Authorization: `Bearer ${currentUser.token}`,
                });
                setUsers(data.results || []);
            } catch (err) {
                setError(err?.message || 'Unable to load users.');
            } finally {
                setIsLoading(false);
            }
        };

        loadUsers();
    }, [currentUser?.token]);

    if (!currentUser) {
        return <div className="card text-academic-700">Please log in to manage users.</div>;
    }

    if (currentUser.role !== 'Administrator') {
        return <div className="card text-academic-700">Admin access required.</div>;
    }

    const updateRole = async (userId, role) => {
        setSavingUserId(userId);
        setError('');
        try {
            const updatedUser = await API.updateUser(userId, { role }, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
            });

            setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));

            if (updatedUser?.id === currentUser.id && onUserUpdate) {
                onUserUpdate({ ...currentUser, role: updatedUser.role });
            }
        } catch (err) {
            setError(err?.message || 'Unable to update role.');
        } finally {
            setSavingUserId(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="card bg-gradient-to-br from-slate-900 to-slate-700 text-white border-slate-700">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-sm mb-4">
                            <Shield className="w-4 h-4" />
                            <span>Admin Console</span>
                        </div>
                        <h1 className="text-3xl font-bold">User Roles</h1>
                        <p className="text-slate-200 mt-2">Upgrade or downgrade any account after it is created.</p>
                    </div>
                    <button className="btn btn-outline bg-white text-slate-900 hover:bg-slate-100" onClick={() => window.location.reload()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {error && <div className="card border-red-200 bg-red-50 text-red-700">{error}</div>}

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-academic-900">All Accounts</h2>
                        <p className="text-sm text-academic-600">Name, email, and role only.</p>
                    </div>
                    <div className="flex items-center space-x-2 text-academic-600 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{users.length} users</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-sm text-academic-600">Loading users...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-academic-200 text-sm text-academic-500">
                                    <th className="py-3 pr-4 font-medium">Name</th>
                                    <th className="py-3 pr-4 font-medium">Email</th>
                                    <th className="py-3 pr-4 font-medium">Role</th>
                                    <th className="py-3 pr-4 font-medium">Change role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-academic-100 last:border-b-0">
                                        <td className="py-4 pr-4">
                                            <div className="font-medium text-academic-900">{user.full_name || user.username}</div>
                                            <div className="text-xs text-academic-500">@{user.username}</div>
                                        </td>
                                        <td className="py-4 pr-4 text-sm text-academic-700">{user.email}</td>
                                        <td className="py-4 pr-4 text-sm">
                                            <span className="badge badge-primary">{user.role}</span>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="relative inline-block">
                                                <select
                                                    value={user.role}
                                                    disabled={savingUserId === user.id}
                                                    onChange={(e) => updateRole(user.id, e.target.value)}
                                                    className="appearance-none pr-9 py-2 pl-3 border border-academic-200 rounded-lg bg-white text-sm text-academic-800"
                                                >
                                                    {ROLE_OPTIONS.map((role) => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-4 h-4 text-academic-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}