import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import * as API from '../api';

export default function SearchResults({ currentUser, onTopicSelect }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get('q') || '').trim();
    const [draftQuery, setDraftQuery] = useState(query);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({ topics: [], posts: [], users: [] });

    useEffect(() => {
        setDraftQuery(query);
    }, [query]);

    useEffect(() => {
        let cancelled = false;
        if (query.length < 2) {
            setResults({ topics: [], posts: [], users: [] });
            setLoading(false);
            return;
        }

        setLoading(true);
        API.searchAll(query)
            .then((data) => {
                if (!cancelled) {
                    setResults({
                        topics: data.topics || [],
                        posts: data.posts || [],
                        users: data.users || [],
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResults({ topics: [], posts: [], users: [] });
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [query]);

    const total = results.topics.length + results.posts.length + results.users.length;

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const next = draftQuery.trim();
        if (next.length < 2) {
            setSearchParams({});
            return;
        }
        setSearchParams({ q: next });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <form onSubmit={handleSearchSubmit} className="sticky top-16 z-30 py-2 md:hidden bg-academic-50">
                <div className="relative rounded-xl border border-academic-300 bg-white shadow-sm ring-1 ring-white">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-academic-500" />
                    <input
                        type="text"
                        value={draftQuery}
                        onChange={(e) => setDraftQuery(e.target.value)}
                        placeholder="Search discussions, topics, users..."
                        className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white text-academic-900 placeholder:text-academic-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white shadow-sm"
                    >
                        Search
                    </button>
                </div>
            </form>

            <div>
                <h1 className="text-2xl font-bold text-academic-900">Search Results</h1>
                <p className="text-academic-600 mt-1">
                    {query.length < 2 ? 'Type at least 2 characters to search.' : `Results for "${query}"`}
                </p>
            </div>

            {loading && <div className="card text-academic-600">Searching...</div>}

            {!loading && query.length >= 2 && total === 0 && (
                <div className="card text-academic-600">No results found.</div>
            )}

            {!loading && results.topics.length > 0 && (
                <div className="card space-y-3">
                    <h2 className="text-lg font-semibold text-academic-900">Topics</h2>
                    <div className="space-y-2">
                        {results.topics.map((topic) => (
                            <Link
                                key={topic.id}
                                to="/"
                                onClick={() => onTopicSelect?.(topic.id)}
                                className="block rounded-lg border border-academic-200 px-3 py-2 hover:bg-academic-50"
                            >
                                <span className="text-academic-800 font-medium">{topic.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {!loading && results.posts.length > 0 && (
                <div className="card space-y-3">
                    <h2 className="text-lg font-semibold text-academic-900">Posts</h2>
                    <div className="space-y-2">
                        {results.posts.map((post) => (
                            <Link
                                key={post.id}
                                to={`/post/${post.id}`}
                                className="block rounded-lg border border-academic-200 px-3 py-2 hover:bg-academic-50"
                            >
                                <div className="text-academic-900 font-medium">{post.title}</div>
                                <div className="text-sm text-academic-500">
                                    by @{post.author}{post.topic ? ` in ${post.topic}` : ''}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {!loading && results.users.length > 0 && (
                <div className="card space-y-3">
                    <h2 className="text-lg font-semibold text-academic-900">Users</h2>
                    <div className="space-y-2">
                        {results.users.map((user) => (
                            <Link
                                key={user.id}
                                to={currentUser?.username === user.username ? '/profile' : `/profile/${user.username}`}
                                className="block rounded-lg border border-academic-200 px-3 py-2 hover:bg-academic-50"
                            >
                                <div className="text-academic-900 font-medium">@{user.username}</div>
                                <div className="text-sm text-academic-500">{user.full_name}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}