import React from 'react';

function formatValue(value) {
    return Number(value || 0).toLocaleString();
}

export default function StatCard({ title, value, subtitle, accent = 'blue' }) {
    const accentClasses = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-500 to-orange-500',
        rose: 'from-rose-500 to-pink-500',
    };

    return (
        <article className="rounded-2xl border border-academic-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-academic-500 dark:text-slate-400">{title}</p>
                    <p className="mt-2 text-3xl font-semibold text-academic-900 dark:text-slate-100">{formatValue(value)}</p>
                    {subtitle && <p className="mt-2 text-sm text-academic-600 dark:text-slate-300">{subtitle}</p>}
                </div>
                <div className={`h-10 w-2 rounded-full bg-linear-to-b ${accentClasses[accent] || accentClasses.blue}`} />
            </div>
        </article>
    );
}
