import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, User, Calendar, FileText, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function formatDateTime(isoTime) {
    if (!isoTime) {
        return 'Unknown date';
    }
    return new Date(isoTime).toLocaleString();
}

export default function PostDetail({ posts, currentUser, onVote }) {
    const { id } = useParams();
    const post = posts.find((item) => item.id === Number(id));
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);

    const authHeaders = (hasJson = false) => {
        const headers = {};
        if (hasJson) {
            headers['Content-Type'] = 'application/json';
        }
        if (currentUser?.token) {
            headers.Authorization = `Bearer ${currentUser.token}`;
        }
        return headers;
    };

    const loadComments = async () => {
        if (!post) {
            return;
        }
        setIsLoadingComments(true);
        try {
            const response = await fetch(`${API_BASE}/posts/${post.id}/comments/`);
            const data = await response.json();
            if (response.ok) {
                setComments(data.results || []);
            }
        } finally {
            setIsLoadingComments(false);
        }
    };

    useEffect(() => {
        loadComments();
    }, [post?.id]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to comment.');
            return;
        }
        if (!commentText.trim()) {
            return;
        }

        const response = await fetch(`${API_BASE}/posts/${post.id}/comments/`, {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ content: commentText.trim() }),
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.detail || 'Unable to add comment.');
            return;
        }

        setComments((prev) => [...prev, data]);
        setCommentText('');
    };

    const handleDeleteComment = async (commentId) => {
        const response = await fetch(`${API_BASE}/comments/${commentId}/`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.detail || 'Unable to delete comment.');
            return;
        }

        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    };

    if (!post) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="card text-center py-12">
                    <FileText className="w-16 h-16 text-academic-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-academic-900 mb-2">Discussion Not Found</h2>
                    <p className="text-academic-600 mb-6">This discussion may have been removed or is unavailable.</p>
                    <Link to="/" className="btn btn-primary">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Feed
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link to="/" className="inline-flex items-center space-x-2 text-academic-600 hover:text-academic-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Discussions</span>
            </Link>

            <div className="card">
                <div className="space-y-6">
                    <div className="border-b border-academic-200 pb-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-4">
                                    <span className="badge badge-primary text-sm">{post.topic || 'Uncategorized'}</span>
                                    <span className="text-sm text-academic-500">{formatDateTime(post.created_at)}</span>
                                </div>

                                <h1 className="text-3xl font-bold text-academic-900 mb-4">{post.title}</h1>

                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-academic-900">{post.author}</div>
                                            <div className="text-sm text-academic-500">Contributor</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 text-sm text-academic-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDateTime(post.updated_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-lg max-w-none">
                        <div className="text-academic-800 leading-relaxed whitespace-pre-wrap">{post.content}</div>
                    </div>

                    {post.references && (
                        <div className="border-t border-academic-200 pt-6">
                            <h3 className="text-lg font-semibold text-academic-900 mb-3">References</h3>
                            <div className="bg-academic-50 rounded-lg p-4">
                                <p className="text-academic-700 italic whitespace-pre-wrap">{post.references}</p>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-academic-200 pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <button
                                    className={`flex items-center space-x-1 p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === 1 ? 'text-green-600' : ''}`}
                                    onClick={() => onVote(post.id, 1)}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-sm font-medium">Upvote</span>
                                </button>
                                <button
                                    className={`flex items-center space-x-1 p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === -1 ? 'text-red-600' : ''}`}
                                    onClick={() => onVote(post.id, -1)}
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    <span className="text-sm font-medium">Downvote</span>
                                </button>
                            </div>

                            <div className="text-sm text-academic-500">Score: {post.score || 0}</div>
                        </div>
                        {!currentUser && <div className="text-sm text-blue-700 mt-3">Log in to cast your vote.</div>}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className="text-xl font-semibold text-academic-900 mb-4">Comments</h3>

                <form onSubmit={handleAddComment} className="space-y-3 mb-6">
                    <textarea
                        placeholder="Write your comment..."
                        rows={3}
                        className="textarea"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <button className="btn btn-primary" type="submit">
                            Add Comment
                        </button>
                    </div>
                </form>

                {isLoadingComments ? (
                    <div className="text-sm text-academic-600">Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div className="text-sm text-academic-600">No comments yet.</div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="border border-academic-200 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-academic-900">{comment.author__username}</div>
                                        <div className="text-xs text-academic-500">{formatDateTime(comment.created_at)}</div>
                                    </div>
                                    {currentUser && (currentUser.username === comment.author__username || ['Administrator', 'Developer', 'Moderator'].includes(currentUser.role)) && (
                                        <button className="btn btn-ghost text-red-600" onClick={() => handleDeleteComment(comment.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-academic-800 mt-3 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
