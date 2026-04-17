import React from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const RANGE_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const SERIES = [
    { dataKey: 'visits', stroke: '#0ea5e9', name: 'Visits' },
    { dataKey: 'logins', stroke: '#10b981', name: 'Logins' },
    { dataKey: 'posts', stroke: '#f59e0b', name: 'Claims Posted' },
    { dataKey: 'votes', stroke: '#f43f5e', name: 'Votes' },
    { dataKey: 'evidence_reviews', stroke: '#8b5cf6', name: 'Evidence Reviews' },
];

export default function LineChartCard({ data, range, onRangeChange }) {
    return (
        <section className="rounded-2xl border border-academic-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-academic-900 dark:text-slate-100">Intellectual Activity Over Time</h2>
                    <p className="text-sm text-academic-600 dark:text-slate-300">Evidence-backed participation trends, not vanity traffic.</p>
                </div>
                <div className="inline-flex rounded-xl border border-academic-200 dark:border-slate-700 p-1 bg-academic-50 dark:bg-slate-800">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onRangeChange(option.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                range === option.value
                                    ? 'bg-white dark:bg-slate-700 text-academic-900 dark:text-slate-100 shadow-sm'
                                    : 'text-academic-600 dark:text-slate-300 hover:text-academic-900 dark:hover:text-slate-100'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 h-90">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.3)' }}
                            labelStyle={{ fontWeight: 600 }}
                        />
                        <Legend />
                        {SERIES.map((line) => (
                            <Line
                                key={line.dataKey}
                                type="monotone"
                                dataKey={line.dataKey}
                                stroke={line.stroke}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                                name={line.name}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
