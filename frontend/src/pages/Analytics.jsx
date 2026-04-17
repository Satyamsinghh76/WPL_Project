import React, { useEffect, useMemo, useState } from 'react';
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

export default function Analytics({ currentUser, authHeaders, isAdmin }) {
    const [range, setRange] = useState('daily');
    const [series, setSeries] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        let isMounted = true;

        const fetchAnalytics = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [seriesData, contributorData, summaryData] = await Promise.all([
                    API.fetchAnalytics(range, authHeaders(true)),
                    API.fetchTopContributors(range, 5, authHeaders(true)),
                    API.fetchAnalyticsSummary(range, authHeaders(true)),
                ]);

                if (!isMounted) {
                    return;
                }

                setSeries(Array.isArray(seriesData) ? seriesData : []);
                setContributors(contributorData?.results || []);
                setSummary(summaryData || null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err.message || 'Failed to load analytics.');
                setSeries([]);
                setContributors([]);
                setSummary(null);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchAnalytics();

        return () => {
            isMounted = false;
        };
    }, [
        range,
        currentUser?.token,
        currentUser?.acting_role,
        currentUser?.id,
    ]);

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

    return (
        <div className="space-y-6 text-slate-100">
            <section className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.15),transparent_40%),linear-gradient(180deg,#06070a,#0e1016)] p-6 sm:p-8 overflow-hidden relative">
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Admin-only intelligence view
                        </p>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">Scholr Admin Analytics</h1>
                        <p className="mt-2 text-slate-300 max-w-3xl">
                            Real activity over vanity metrics: how often people return, publish claims, and evaluate each other with evidence.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200">
                        <Brain className="w-4 h-4 text-violet-300" />
                        <span className="text-sm">Thinking Score = posts + votes + evidence reviews</span>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-white">{formatMetric(allTimeVisits)}</p>
                    <p className="mt-1 text-sm text-slate-300">All-time visits</p>
                    <p className="mt-2 text-xs text-slate-400">Known accounts: {formatMetric(knownVisitorAccounts)} · Anonymous: {formatMetric(anonymousVisits)}</p>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                        <Activity className="w-5 h-5" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-white">{formatMetric(totals.logins)}</p>
                    <p className="mt-1 text-sm text-slate-300">Logins ({range})</p>
                    <p className="mt-2 text-xs text-slate-400">Returning user behavior</p>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                        <Clock3 className="w-5 h-5" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-white">{formatMetric(totals.posts)}</p>
                    <p className="mt-1 text-sm text-slate-300">Claims posted ({range})</p>
                    <p className="mt-2 text-xs text-slate-400">Argument production</p>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-white">{formatMetric(totalJudgmentActions)}</p>
                    <p className="mt-1 text-sm text-slate-300">Votes + evidence reviews ({range})</p>
                    <p className="mt-2 text-xs text-slate-400">Judgment quality signals</p>
                </article>
            </section>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-1">
                <LineChartCard data={series} range={range} onRangeChange={setRange} />
            </div>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <article className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        Thinking Score
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                        Thinking Score = posts + votes + evidence reviews. This rewards deliberate contribution and peer evaluation.
                    </p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400">Posts</p>
                            <p className="text-2xl font-semibold text-white">{formatMetric(totals.posts)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400">Votes</p>
                            <p className="text-2xl font-semibold text-white">{formatMetric(totals.votes)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400">Evidence Reviews</p>
                            <p className="text-2xl font-semibold text-white">{formatMetric(totals.evidenceReviews)}</p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <p className="text-xs uppercase tracking-wider text-emerald-200">Total Thinking Score ({range})</p>
                        <p className="mt-1 text-3xl font-semibold text-emerald-100">{formatMetric(summary?.thinking_score ?? totalJudgmentActions + totals.posts)}</p>
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Top Contributors
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">Ranked by live activity in the selected time range.</p>
                    <div className="mt-4 space-y-3">
                        {contributors.length === 0 && !isLoading && (
                            <p className="text-sm text-slate-400">No contributor activity yet.</p>
                        )}
                        {contributors.map((contributor, index) => (
                            <div key={contributor.user_id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            #{index + 1} @{contributor.username}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-300">posts {formatMetric(contributor.posts)} · votes {formatMetric(contributor.votes)} · reviews {formatMetric(contributor.evidence_reviews)}</p>
                                    </div>
                                    <div className="inline-flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-200 px-2 py-1 text-xs font-semibold">
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
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                    Loading live analytics...
                </div>
            )}
        </div>
    );
}
