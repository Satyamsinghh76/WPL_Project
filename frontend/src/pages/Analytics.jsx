import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, BarChart3, Brain, Clock3, ShieldCheck, TrendingUp, Users } from 'lucide-react';

import LineChartCard from '../components/LineChartCard';
import * as API from '../api';

function sumByKey(rows, key) {
    return rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
}

function formatMetric(value) {
    return Number(value || 0).toLocaleString();
}

export default function Analytics({ currentUser, authHeaders, isAdmin, theme = 'light' }) {
    const [range, setRange] = useState('daily');
    const [series, setSeries] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    const isDark = theme === 'dark';
    const pageText = isDark ? 'text-slate-100' : 'text-slate-900';
    const shellClass = isDark
        ? 'rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.15),transparent_40%),linear-gradient(180deg,#06070a,#0e1016)]'
        : 'rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]';
    const panelClass = isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white shadow-sm';
    const subTextClass = isDark ? 'text-slate-300' : 'text-slate-600';
    const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
    const statAccentClass = isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white shadow-sm';

    const loadAnalytics = useCallback(async () => {
        setIsLoading(true);
        setError('');

        try {
            const [seriesData, contributorData, summaryData] = await Promise.all([
                API.fetchAnalytics(range, authHeaders(true)),
                API.fetchTopContributors(range, 5, authHeaders(true)),
                API.fetchAnalyticsSummary(range, authHeaders(true)),
            ]);

            setSeries(Array.isArray(seriesData) ? seriesData : []);
            setContributors(contributorData?.results || []);
            setSummary(summaryData || null);
        } catch (err) {
            setError(err.message || 'Failed to load analytics.');
            setSeries([]);
            setContributors([]);
            setSummary(null);
        } finally {
            setIsLoading(false);
        }
    }, [authHeaders, range]);

    useEffect(() => {
        let cancelled = false;

        const refresh = async () => {
            if (!cancelled) {
                await loadAnalytics();
            }
        };

        refresh();

        const intervalId = window.setInterval(refresh, 10000);
        const handleFocus = () => refresh();
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [loadAnalytics]);

    const totals = useMemo(() => {
        if (summary) {
            return {
                visits: Number(summary.visits || 0),
                logins: Number(summary.logins || 0),
                posts: Number(summary.posts || 0),
                votes: Number(summary.votes || 0),
                evidenceReviews: Number(summary.evidence_reviews || 0),
            };
        }

        return {
            visits: sumByKey(series, 'visits'),
            logins: sumByKey(series, 'logins'),
            posts: sumByKey(series, 'posts'),
            votes: sumByKey(series, 'votes'),
            evidenceReviews: sumByKey(series, 'evidence_reviews'),
        };
    }, [series, summary]);

    const totalJudgmentActions = totals.votes + totals.evidenceReviews;
    const allTimeVisits = Number(summary?.total_visits_all_time || 0);
    const knownVisitorAccounts = Number(summary?.known_visitor_accounts_all_time || 0);
    const anonymousVisits = Number(summary?.anonymous_visits_all_time || 0);
    const loginSessionsAllTime = Number(summary?.login_sessions_all_time || 0);
    const uniqueLoginUsersAllTime = Number(summary?.unique_login_users_all_time || 0);

    return (
        <div className={`space-y-6 ${pageText}`}>
            <section className={`${shellClass} p-6 sm:p-8 overflow-hidden relative`}>
                {!isDark && <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-cyan-500 to-emerald-500" />}
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${isDark ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-emerald-600/20 bg-emerald-50 text-emerald-700'}`}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin-only intelligence view
                        </p>
                        <h1 className={`mt-4 text-3xl sm:text-4xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Scholr Admin Analytics</h1>
                        <p className={`mt-2 max-w-3xl ${subTextClass}`}>
                            Real activity over vanity metrics: how often people return, publish claims, and evaluate each other with evidence.
                        </p>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        <Brain className="w-4 h-4 text-violet-300" />
                        <span className="text-sm">Thinking Score = posts + votes + evidence reviews</span>
                    </div>
                </div>
            </section>

            {error && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    {error}
                </div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <article className={`rounded-2xl border p-5 ${statAccentClass}`}>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Users className="w-5 h-5" />
                    </div>
                    <p className={`mt-4 text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(allTimeVisits)}</p>
                    <p className={`mt-1 text-sm ${subTextClass}`}>All-time visits</p>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>Known accounts: {formatMetric(knownVisitorAccounts)} · Anonymous: {formatMetric(anonymousVisits)}</p>
                </article>

                <article className={`rounded-2xl border p-5 ${statAccentClass}`}>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-600'}`}>
                        <Activity className="w-5 h-5" />
                    </div>
                    <p className={`mt-4 text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(uniqueLoginUsersAllTime)}</p>
                    <p className={`mt-1 text-sm ${subTextClass}`}>Logged-in users ever</p>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>Historical sessions: {formatMetric(loginSessionsAllTime)} · Current range: {formatMetric(totals.logins)}</p>
                </article>

                <article className={`rounded-2xl border p-5 ${statAccentClass}`}>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}`}>
                        <Clock3 className="w-5 h-5" />
                    </div>
                    <p className={`mt-4 text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(totals.posts)}</p>
                    <p className={`mt-1 text-sm ${subTextClass}`}>Claims posted ({range})</p>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>Argument production</p>
                </article>

                <article className={`rounded-2xl border p-5 ${statAccentClass}`}>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className={`mt-4 text-3xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(totalJudgmentActions)}</p>
                    <p className={`mt-1 text-sm ${subTextClass}`}>Votes + evidence reviews ({range})</p>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>Judgment quality signals</p>
                </article>
            </section>

            <div className={`rounded-2xl border p-1 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white'}`}>
                <LineChartCard data={series} range={range} onRangeChange={setRange} />
            </div>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <article className={`xl:col-span-2 rounded-2xl border p-5 ${panelClass}`}>
                    <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        Thinking Score
                    </h2>
                    <p className={`mt-1 text-sm ${subTextClass}`}>
                        Thinking Score = posts + votes + evidence reviews. This rewards deliberate contribution and peer evaluation.
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                            <p className={`text-xs uppercase tracking-wider ${mutedTextClass}`}>Posts</p>
                            <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(totals.posts)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                            <p className={`text-xs uppercase tracking-wider ${mutedTextClass}`}>Votes</p>
                            <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(totals.votes)}</p>
                        </div>
                        <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                            <p className={`text-xs uppercase tracking-wider ${mutedTextClass}`}>Evidence Reviews</p>
                            <p className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMetric(totals.evidenceReviews)}</p>
                        </div>
                    </div>
                    <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50 shadow-inner'}`}>
                        <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>Total Thinking Score ({range})</p>
                        <p className={`mt-1 text-3xl font-semibold ${isDark ? 'text-emerald-100' : 'text-emerald-900'}`}>{formatMetric(summary?.thinking_score ?? totalJudgmentActions + totals.posts)}</p>
                    </div>
                </article>

                <article className={`rounded-2xl border p-5 ${panelClass}`}>
                    <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Users className="w-5 h-5 text-blue-400" />
                        Top Contributors
                    </h2>
                    <p className={`mt-1 text-sm ${subTextClass}`}>Ranked by live activity in the selected time range.</p>
                    <div className="mt-4 space-y-3">
                        {contributors.length === 0 && !isLoading && (
                            <p className={`text-sm ${mutedTextClass}`}>No contributor activity yet.</p>
                        )}
                        {contributors.map((contributor, index) => (
                            <div key={contributor.user_id} className={`rounded-xl border p-3 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            #{index + 1} @{contributor.username}
                                        </p>
                                        <p className={`mt-1 text-xs ${subTextClass}`}>posts {formatMetric(contributor.posts)} · votes {formatMetric(contributor.votes)} · reviews {formatMetric(contributor.evidence_reviews)}</p>
                                    </div>
                                    <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${isDark ? 'border-blue-500/40 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        {formatMetric(contributor.thinking_score)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            {isLoading && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-slate-800 bg-slate-950/80 text-slate-300' : 'border-slate-200 bg-white text-slate-600 shadow-sm'}`}>
                    Loading live analytics...
                </div>
            )}
        </div>
    );
}
