import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Trash2, TrendingUp, Filter, Eye, EyeOff, FolderPlus } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import MarkdownContent from '../components/MarkdownContent';

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
    activeSort,
    activeTopicId,
    role,
    currentUser,
    topics,
    isLoadingPosts,
    isLoadingMorePosts,
    feedHasMore,
    handleDelete,
    handleToggleHidden,
    handlePostForm,
    handleVote,
    handleLoadMorePosts,
    handleCreateTopic,
    handleFilterChange,
    formData,
    setFormData,
}) {
    const [sortBy, setSortBy] = useState('new');
    const [filterTopic, setFilterTopic] = useState('all');
    const [showPostForm, setShowPostForm] = useState(false);
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [topicDraft, setTopicDraft] = useState({ name: '', parent_id: '' });
    const [isPreviewingPost, setIsPreviewingPost] = useState(false);

    const canPost = role !== 'General User';
    const canModerate = ['Moderator', 'Administrator', 'Developer'].includes(role);
    const canCreateTopic = role === 'Administrator';
    const feedLoaderRef = useInfiniteScroll({
        enabled: !isLoadingPosts,
        hasMore: feedHasMore,
        isLoading: isLoadingMorePosts,
        onLoadMore: handleLoadMorePosts,
    });

    useEffect(() => {
        setSortBy(activeSort || 'new');
    }, [activeSort]);

    useEffect(() => {
        setFilterTopic(activeTopicId == null ? 'all' : String(activeTopicId));
    }, [activeTopicId]);

    // Fetch posts with new filters when sort or topic changes
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        if (handleFilterChange) {
            handleFilterChange({ sort: newSort, topic_id: filterTopic === 'all' ? null : filterTopic });
        }
    };

    const handleTopicChange = (newTopic) => {
        setFilterTopic(newTopic);
        if (handleFilterChange) {
            handleFilterChange({ sort: sortBy, topic_id: newTopic === 'all' ? null : newTopic });
        }
    };

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

    const topicOptions = useMemo(() => {
        const childrenByParent = new Map();
        topics.forEach((topic) => {
            const parentKey = topic.parent_id == null ? 'root' : String(topic.parent_id);
            if (!childrenByParent.has(parentKey)) {
                childrenByParent.set(parentKey, []);
            }
            childrenByParent.get(parentKey).push(topic);
        });

        for (const entries of childrenByParent.values()) {
            entries.sort((a, b) => a.name.localeCompare(b.name));
        }

        const flattened = [];
        const visited = new Set();

        const walk = (parentKey, depth) => {
            const entries = childrenByParent.get(parentKey) || [];
            entries.forEach((entry) => {
                if (visited.has(entry.id)) {
                    return;
                }
                visited.add(entry.id);
                flattened.push({
                    id: entry.id,
                    name: entry.name,
                    depth,
                });
                walk(String(entry.id), depth + 1);
            });
        };

        walk('root', 0);
        return flattened;
    }, [topics]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-academic-900">Academic Discussions</h1>
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
                                {topicOptions.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                        {`${'   '.repeat(topic.depth)}${topic.name}`}
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
                                    {topicOptions.map((topic) => (
                                        <option key={topic.id} value={topic.id}>
                                            {`${'   '.repeat(topic.depth)}${topic.name}`}
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
                            <div className="mb-1 flex items-center justify-between">
                                <label className="block text-sm font-medium text-academic-700">Content</label>
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewingPost((prev) => !prev)}
                                    className="text-sm text-academic-600 hover:text-academic-900 transition-colors"
                                >
                                    {isPreviewingPost ? 'Edit' : 'Preview'}
                                </button>
                            </div>

                            {isPreviewingPost ? (
                                <div className="min-h-40 rounded-lg border border-academic-200 bg-academic-50 p-4">
                                    {formData.content.trim() ? (
                                        <MarkdownContent content={formData.content} />
                                    ) : (
                                        <p className="text-sm text-academic-500">Preview will appear here as you write Markdown/LaTeX.</p>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    placeholder="Share your research, insights, or questions... Supports Markdown and LaTeX (e.g. $E=mc^2$)."
                                    rows={7}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="textarea"
                                    required
                                />
                            )}
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
                        <select value={filterTopic} onChange={(e) => handleTopicChange(e.target.value)} className="text-sm border-0 focus:ring-0 bg-transparent">
                            <option value="all">All Topics</option>
                            {topicOptions.map((topic) => (
                                <option key={topic.id} value={String(topic.id)}>
                                    {`${'   '.repeat(topic.depth)}${topic.name}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 bg-white rounded-lg border border-academic-200 px-3 py-2">
                        <TrendingUp className="w-4 h-4 text-academic-500" />
                        <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)} className="text-sm border-0 focus:ring-0 bg-transparent">
                            <option value="hot">Top Score</option>
                            <option value="new">Newest</option>
                        </select>
                    </div>
                </div>

                <div className="text-sm text-academic-600">{posts.length} {posts.length === 1 ? 'discussion' : 'discussions'}</div>
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
                ) : posts.length === 0 ? (
                    <div className="card text-center py-12">
                        <MessageSquare className="w-12 h-12 text-academic-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-academic-900 mb-2">No discussions yet</h3>
                        <p className="text-academic-600">Try creating a topic or publish the first discussion.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <article
                                key={post.id}
                                className="rounded-2xl border border-academic-200 bg-white px-4 py-5 sm:px-8 sm:py-8 flex flex-col justify-between shadow-sm"
                            >
                                <div className="space-y-5 sm:space-y-6">
                                    <div className="flex items-center justify-between text-xs text-academic-500">
                                        <span className="inline-flex items-center rounded-full border border-academic-200 px-2 py-0.5">{post.topic || 'Uncategorized'}</span>
                                        <span>{formatTime(post.created_at)}</span>
                                    </div>

                                    {post.title && (
                                        <Link
                                            to={`/post/${post.id}`}
                                            className="block text-xl sm:text-2xl font-bold leading-tight text-academic-900 hover:text-academic-700 transition-colors line-clamp-3"
                                        >
                                            {post.title}
                                        </Link>
                                    )}

                                    {post.content && (
                                        <Link
                                            to={`/post/${post.id}`}
                                            className="block text-xs sm:text-sm font-normal leading-relaxed text-academic-700 hover:text-academic-900 transition-colors line-clamp-6"
                                        >
                                            {post.content}
                                        </Link>
                                    )}

                                    <Link
                                        to={`/post/${post.id}`}
                                        className="inline-block text-sm text-academic-700 hover:text-academic-900 transition-colors font-medium"
                                    >
                                        Read full post...
                                    </Link>
                                </div>

                                <div className="mt-6 border-t border-academic-100 pt-4 flex items-end justify-between gap-3">
                                    <div className="space-y-1">
                                        <Link to={`/profile/${post.author}`} className="text-xs sm:text-sm font-medium text-academic-700 hover:text-primary-700">
                                            @{post.author}
                                        </Link>
                                        <div className="text-xs text-academic-500">Score {post.score || 0}</div>
                                    </div>

                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button
                                            className={`p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === 1 ? 'text-green-600' : 'text-academic-600'}`}
                                            onClick={() => handleVote(post.id, 1)}
                                            aria-label="Upvote"
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                        </button>
                                        <button
                                            className={`p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === -1 ? 'text-red-600' : 'text-academic-600'}`}
                                            onClick={() => handleVote(post.id, -1)}
                                            aria-label="Downvote"
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                        </button>
                                        {canModerate && (
                                            <button
                                                onClick={() => handleToggleHidden(post.id, !post.is_hidden)}
                                                className="p-2 rounded-lg hover:bg-amber-50 text-amber-700 transition-colors"
                                                title={post.is_hidden ? 'Unhide post' : 'Hide post'}
                                            >
                                                {post.is_hidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                            </button>
                                        )}
                                        {canModerate && (
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                                title="Delete post permanently"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                        <div ref={feedLoaderRef} className="py-6 text-center text-sm text-academic-500">
                            {isLoadingMorePosts ? 'Loading more discussions...' : feedHasMore ? 'Scroll for more discussions' : 'You are all caught up'}
                        </div>
                    </div>
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
