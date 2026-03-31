import React, { useState } from 'react';

export default function Settings({ currentUser }) {
    const [prefs, setPrefs] = useState({
        emailReplies: true,
        weeklyDigest: false,
        moderationAlerts: true,
    });

    if (!currentUser) {
        return <div className="card text-academic-700">Please log in to view settings.</div>;
    }

    const handleToggle = (key) => {
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="settings-page max-w-2xl mx-auto card">
            <h2 className="text-2xl font-bold text-academic-900 mb-4">Settings</h2>
            <p className="text-sm text-academic-600 mb-6">Notification preferences placeholder (static for now).</p>

            <div className="space-y-4">
                <label className="flex items-center justify-between border border-academic-200 rounded-lg p-4 cursor-pointer">
                    <div>
                        <div className="font-medium text-academic-900">Email on Direct Replies</div>
                        <div className="text-sm text-academic-600">Get email when someone replies to your post/comment.</div>
                    </div>
                    <input type="checkbox" checked={prefs.emailReplies} onChange={() => handleToggle('emailReplies')} />
                </label>

                <label className="flex items-center justify-between border border-academic-200 rounded-lg p-4 cursor-pointer">
                    <div>
                        <div className="font-medium text-academic-900">Weekly Digest</div>
                        <div className="text-sm text-academic-600">Receive a weekly summary of top discussions.</div>
                    </div>
                    <input type="checkbox" checked={prefs.weeklyDigest} onChange={() => handleToggle('weeklyDigest')} />
                </label>

                <label className="flex items-center justify-between border border-academic-200 rounded-lg p-4 cursor-pointer">
                    <div>
                        <div className="font-medium text-academic-900">Moderation Alerts</div>
                        <div className="text-sm text-academic-600">Get notified about reports and moderation actions.</div>
                    </div>
                    <input type="checkbox" checked={prefs.moderationAlerts} onChange={() => handleToggle('moderationAlerts')} />
                </label>
            </div>
        </div>
    );
}
