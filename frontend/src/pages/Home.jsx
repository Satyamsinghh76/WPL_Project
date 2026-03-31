import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Trash2, TrendingUp, Filter, Eye, FolderPlus } from 'lucide-react';

function formatTime(isoTime) {
    if (!isoTime) {
        return 'just now';
    }

    const now = Date.now();
    const created = new Date(isoTime).getTime();
    const diffMs = Math.max(now - created, 0);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
        const value = Math.max(Math.floor(diffMs / minute), 1);
        return `${value}m ago`;
    }
    if (diffMs < day) {
        const value = Math.floor(diffMs / hour);
        return `${value}h ago`;
    }

    const value = Math.floor(diffMs / day);
    return `${value}d ago`;
}

export default function Home({
    posts,
    role,
    currentUser,
    topics,
    isLoadingPosts,
    handleDelete,
    handlePostForm,
    handleVote,
    handleCreateTopic,
    formData,
    setFormData,
}) {
    const [sortBy, setSortBy] = useState('hot');
    const [filterTopic, setFilterTopic] = useState('all');
    const [showPostForm, setShowPostForm] = useState(false);
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [topicDraft, setTopicDraft] = useState({ name: '', parent_id: '' });

    const canPost = role !== 'General User';
    const canModerate = ['Moderator', 'Administrator', 'Developer'].includes(role);
    const canCreateTopic = role === 'Administrator';

    const filteredPosts = useMemo(
        () => posts.filter((post) => filterTopic === 'all' || String(post.topic_id) === filterTopic),
        [posts, filterTopic]
    );

    const sortedPosts = useMemo(() => {
        const copy = [...filteredPosts];
        if (sortBy === 'new') {
            copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else {
            copy.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
        return copy;
    }, [filteredPosts, sortBy]);

    const handleTopicSubmit = async (e) => {
        e.preventDefault();
        if (!topicDraft.name.trim()) {
            return;
        }

        const ok = await handleCreateTopic({
            name: topicDraft.name.trim(),
            parent_id: topicDraft.parent_id || null,
        });

        if (ok) {
            setTopicDraft({ name: '', parent_id: '' });
            setShowTopicForm(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-academic-900">Academic Discussions</h1>
                    <p className="text-academic-600 mt-1">Live discussions from the backend feed</p>
                </div>

                <div className="flex items-center gap-2">
                    {canCreateTopic && (
                        <button onClick={() => setShowTopicForm((prev) => !prev)} className="btn btn-outline flex items-center space-x-2">
                            <FolderPlus className="w-4 h-4" />
                            <span>Add Topic</span>
                        </button>
                    )}

                    {canPost && (
                        <button onClick={() => setShowPostForm(!showPostForm)} className="btn btn-primary flex items-center space-x-2">
                            <Plus className="w-4 h-4" />
                            <span>New Discussion</span>
                        </button>
                    )}
                </div>
            </div>

            {canCreateTopic && showTopicForm && (
                <div className="card card-hover animate-fade-in">
                    <h3 className="text-lg font-semibold text-academic-900 mb-4">Create Topic</h3>
                    <form onSubmit={handleTopicSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Topic Name</label>
                            <input
                                type="text"
                                value={topicDraft.name}
                                onChange={(e) => setTopicDraft((prev) => ({ ...prev, name: e.target.value }))}
                                className="input"
                                placeholder="Enter topic name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Parent Topic (optional)</label>
                            <select
                                value={topicDraft.parent_id}
                                onChange={(e) => setTopicDraft((prev) => ({ ...prev, parent_id: e.target.value }))}
                                className="input"
                            >
                                <option value="">No parent</option>
                                {topics.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowTopicForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Save Topic
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {canPost && showPostForm && (
                <div className="card card-hover animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-academic-900">Start a Discussion</h3>
                        <button onClick={() => setShowPostForm(false)} className="text-academic-400 hover:text-academic-600">
                            ×
                        </button>
                    </div>

                    <form
                        onSubmit={async (e) => {
                            const ok = await handlePostForm(e);
                            if (ok) {
                                setShowPostForm(false);
                            }
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1">Academic Topic</label>
                                <select
                                    value={formData.topic_id}
                                    onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select a topic...</option>
                                    {topics.map((topic) => (
                                        <option key={topic.id} value={topic.id}>
                                            {topic.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="Enter discussion title..."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Content</label>
                            <textarea
                                placeholder="Share your research, insights, or questions..."
                                rows={5}
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="textarea"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">References (Optional)</label>
                            <input
                                type="text"
                                placeholder="Citations, DOIs, links to papers..."
                                value={formData.refs}
                                onChange={(e) => setFormData({ ...formData, refs: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowPostForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Publish Discussion
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center space-x-2 bg-white rounded-lg border border-academic-200 px-3 py-2">
                        <Filter className="w-4 h-4 text-academic-500" />
                        <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="text-sm border-0 focus:ring-0 bg-transparent">
                            <option value="all">All Topics</option>
                            {topics.map((topic) => (
                                <option key={topic.id} value={String(topic.id)}>
                                    {topic.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 bg-white rounded-lg border border-academic-200 px-3 py-2">
                        <TrendingUp className="w-4 h-4 text-academic-500" />
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm border-0 focus:ring-0 bg-transparent">
                            <option value="hot">Top Score</option>
                            <option value="new">Newest</option>
                        </select>
                    </div>
                </div>

                <div className="text-sm text-academic-600">{sortedPosts.length} {sortedPosts.length === 1 ? 'discussion' : 'discussions'}</div>
            </div>

            {!canPost && currentUser && (
                <div className="card bg-blue-50 border-blue-200">
                    <div className="flex items-start space-x-3">
                        <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-blue-900">Read-only access</h4>
                            <p className="text-sm text-blue-700 mt-1">You are logged in, but your role currently cannot post or vote.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {isLoadingPosts ? (
                    <div className="card text-center py-10 text-academic-600">Loading discussions...</div>
                ) : sortedPosts.length === 0 ? (
                    <div className="card text-center py-12">
                        <MessageSquare className="w-12 h-12 text-academic-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-academic-900 mb-2">No discussions yet</h3>
                        <p className="text-academic-600">Try creating a topic or publish the first discussion.</p>
                    </div>
                ) : (
                    sortedPosts.map((post) => (
                        <div key={post.id} className="card card-hover group">
                            <div className="flex items-start space-x-4">
                                <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                                    <button
                                        className={`p-1 rounded hover:bg-academic-100 transition-colors ${post.user_vote === 1 ? 'text-green-600' : ''}`}
                                        onClick={() => handleVote(post.id, 1)}
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium text-academic-900">{post.score || 0}</span>
                                    <button
                                        className={`p-1 rounded hover:bg-academic-100 transition-colors ${post.user_vote === -1 ? 'text-red-600' : ''}`}
                                        onClick={() => handleVote(post.id, -1)}
                                    >
                                        <ThumbsDown className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <span className="badge badge-primary">{post.topic || 'Uncategorized'}</span>
                                                <span className="text-xs text-academic-500">{formatTime(post.created_at)}</span>
                                            </div>

                                            <Link to={`/post/${post.id}`} className="text-lg font-semibold text-academic-900 hover:text-primary-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </Link>

                                            <p className="text-academic-600 mt-2 line-clamp-3">{post.content}</p>

                                            <div className="flex items-center space-x-4 mt-3 text-sm text-academic-500">
                                                <span>by {post.author}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canModerate && (
                                        <button
                                            onClick={() => handleDelete(post.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                            title="Delete post"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!currentUser && (
                <div className="card bg-blue-50 border-blue-200">
                    <div className="text-sm text-blue-800">
                        You can read discussions now. Log in to post, vote, and manage content based on your role.
                        <Link to="/login" className="underline font-medium ml-1">Log in</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
