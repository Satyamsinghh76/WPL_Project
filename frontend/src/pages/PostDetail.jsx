import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit2, FileText, Flag, ThumbsDown, ThumbsUp, Trash2, User, Zap } from 'lucide-react';
import * as API from '../api';
import MarkdownContent from '../components/MarkdownContent';
import PostMediaCarousel from '../components/PostMediaCarousel';

function formatDateTime(isoTime) {
    if (!isoTime) {
        return 'Unknown date';
    }
    return new Date(isoTime).toLocaleString();
}

export default function PostDetail({ posts, currentUser, onVote, onCommentVote }) {
    const { id } = useParams();
    const postFromFeed = posts.find((item) => item.id === Number(id));
    const [post, setPost] = useState(postFromFeed || null);
    const [isLoadingPost, setIsLoadingPost] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportMessage, setReportMessage] = useState('');

    const sortComments = (items) => [...items].sort((left, right) => {
        const scoreDelta = (right.score || 0) - (left.score || 0);
        if (scoreDelta !== 0) {
            return scoreDelta;
        }
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    });

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

    const canReport = Boolean(currentUser && (currentUser.acting_role || currentUser.role) !== 'General User');

    const loadPost = async () => {
        setIsLoadingPost(true);
        try {
            const data = await API.fetchPost(id, currentUser?.id);
            setPost(data);
        } catch {
            setPost(postFromFeed || null);
        } finally {
            setIsLoadingPost(false);
        }
    };

    const loadComments = async () => {
        if (!post) {
            return;
        }

        setIsLoadingComments(true);
        try {
            const data = await API.fetchComments(post.id, currentUser?.id);
            setComments(sortComments(data.results || []));
        } catch {
            setComments([]);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const loadRelatedPosts = async () => {
        if (!post) {
            return;
        }

        try {
            const data = await API.fetchRelatedPosts(post.id, { userId: currentUser?.id, limit: 3 });
            setRelatedPosts(data.results || []);
        } catch {
            setRelatedPosts([]);
        }
    };

    useEffect(() => {
        loadPost();
    }, [id, currentUser?.id]);

    useEffect(() => {
        if (!post?.id) {
            return;
        }
        loadComments();
        loadRelatedPosts();
    }, [post?.id, currentUser?.id]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to comment.');
            return;
        }
        if (!commentText.trim()) {
            return;
        }

        try {
            const data = await API.createComment(post.id, { content: commentText.trim() }, authHeaders(true));
            setComments((prev) => sortComments([...prev, data]));
            setCommentText('');
        } catch {
            alert('Unable to add comment.');
        }
    };

    const handleCommentVote = async (commentId, value) => {
        if (!currentUser) {
            alert('Please log in to vote.');
            return;
        }

        try {
            const voteComment = onCommentVote || (async (commentIdToVote, voteValue) => API.voteComment(commentIdToVote, { value: voteValue }, authHeaders(true)));
            const data = await voteComment(commentId, value);
            if (!data) {
                return;
            }

            setComments((prev) => sortComments(prev.map((comment) => (
                comment.id === commentId
                    ? { ...comment, score: data.score, user_vote: data.user_vote }
                    : comment
            ))));
        } catch (error) {
            alert(error?.message || 'Unable to vote on this comment.');
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await API.deleteComment(commentId, authHeaders());
            setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        } catch {
            alert('Unable to delete comment.');
        }
    };

    const handleReportPost = async (e) => {
        e.preventDefault();
        if (!canReport) {
            setReportMessage('Only verified users can submit reports.');
            return;
        }

        const reason = reportReason.trim();
        if (!reason) {
            setReportMessage('Please describe why you are reporting this post.');
            return;
        }

        try {
            await API.reportPost(post.id, { reason }, authHeaders(true));
            setReportReason('');
            setShowReportForm(false);
            setReportMessage('Report submitted.');
        } catch (error) {
            setReportMessage(error?.message || 'Unable to submit report.');
        }
    };

    if (isLoadingPost && !post) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="card text-center py-12">
                    <h2 className="text-2xl font-bold text-academic-900 mb-2">Loading Discussion...</h2>
                </div>
            </div>
        );
    }

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

    const authorName = post.author_username || post.author;
    const canEditPost = Boolean(currentUser && post.author_id === currentUser.id);
    const references = Array.isArray(post.references) ? post.references : [];

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
                                    {post.is_ai && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-purple-700 text-sm">
                                            <Zap className="w-3 h-3" />
                                            AI
                                        </span>
                                    )}
                                    <span className="text-sm text-academic-500">{formatDateTime(post.created_at)}</span>
                                </div>

                                <h1 className="text-3xl font-bold text-academic-900 mb-4">{post.title}</h1>

                                <div className="flex items-center space-x-4">
                                    <Link to={`/profile/${authorName}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-academic-900 hover:text-primary-600 hover:underline">@{authorName}</div>
                                            <div className="text-sm text-academic-500">Contributor</div>
                                        </div>
                                    </Link>
                                    <div className="flex items-center space-x-1 text-sm text-academic-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDateTime(post.updated_at)}</span>
                                    </div>
                                    {canEditPost && (
                                        <Link
                                            to={`/post/${post.id}/edit`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-lg max-w-none">
                        {Array.isArray(post.media_items) && post.media_items.length > 0 && (
                            <div className="mb-6 not-prose">
                                <PostMediaCarousel items={post.media_items} maxHeightClass="h-72 sm:h-96" />
                            </div>
                        )}
                        <MarkdownContent content={post.content || ''} className="text-academic-800 leading-relaxed" />
                    </div>

                    {references.length > 0 && (
                        <div className="border-t border-academic-200 pt-6">
                            <h3 className="text-lg font-semibold text-academic-900 mb-3">References</h3>
                            <div className="bg-academic-50 rounded-lg p-4 space-y-2">
                                {references.map((ref, idx) => (
                                    <div key={`${ref.url || 'ref'}-${idx}`} className="text-academic-700">
                                        <a
                                            href={ref.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary-700 hover:text-primary-900 hover:underline break-all"
                                        >
                                            {ref.title || ref.url}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-t border-academic-200 pt-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-2">
                                <button
                                    className={`flex items-center space-x-1 p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === 1 ? 'text-green-600' : ''}`}
                                    onClick={() => onVote(post.id, 1)}
                                    type="button"
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-sm font-medium">Upvote</span>
                                </button>
                                <button
                                    className={`flex items-center space-x-1 p-2 rounded-lg hover:bg-academic-100 transition-colors ${post.user_vote === -1 ? 'text-red-600' : ''}`}
                                    onClick={() => onVote(post.id, -1)}
                                    type="button"
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    <span className="text-sm font-medium">Downvote</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-academic-500">
                                <span>Score: {post.score || 0}</span>
                                {canReport && (
                                    <button
                                        type="button"
                                        onClick={() => setShowReportForm((prev) => !prev)}
                                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 hover:underline"
                                    >
                                        <Flag className="w-4 h-4" />
                                        Report post
                                    </button>
                                )}
                            </div>
                        </div>

                        {!currentUser && <div className="text-sm text-blue-700 mt-3">Log in to cast your vote.</div>}

                        {showReportForm && canReport && (
                            <form onSubmit={handleReportPost} className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <label className="block text-sm font-medium text-academic-800">Why are you reporting this post?</label>
                                <textarea
                                    rows={4}
                                    className="textarea"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Describe the issue..."
                                />
                                <div className="flex items-center gap-3">
                                    <button type="submit" className="btn btn-primary">Submit report</button>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowReportForm(false)}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {reportMessage && <div className="text-sm text-academic-700 mt-3">{reportMessage}</div>}
                    </div>
                </div>
            </div>

            <div className="card space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-academic-900">Comments</h3>
                    <span className="text-sm text-academic-500">Highest voted first</span>
                </div>

                <form onSubmit={handleAddComment} className="space-y-3">
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

                <div className="max-h-[30rem] overflow-y-auto pr-2">
                    {isLoadingComments ? (
                        <div className="text-sm text-academic-600">Loading comments...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-sm text-academic-600">No comments yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => {
                                const commentAuthor = comment.author_username || comment.author__username;
                                return (
                                    <div key={comment.id} className="border border-academic-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <Link to={`/profile/${commentAuthor}`} className="font-medium text-academic-900 hover:text-primary-600 hover:underline transition-colors">
                                                    @{commentAuthor}
                                                </Link>
                                                <div className="text-xs text-academic-500">{formatDateTime(comment.created_at)}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center rounded-full border border-academic-200 bg-academic-50 px-2 py-1 text-xs text-academic-600">
                                                    Score {comment.score || 0}
                                                </div>
                                                {currentUser && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className={`p-2 rounded-lg hover:bg-academic-100 transition-colors ${comment.user_vote === 1 ? 'text-green-600' : 'text-academic-500'}`}
                                                            onClick={() => handleCommentVote(comment.id, 1)}
                                                            aria-label="Upvote comment"
                                                            type="button"
                                                        >
                                                            <ThumbsUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className={`p-2 rounded-lg hover:bg-academic-100 transition-colors ${comment.user_vote === -1 ? 'text-red-600' : 'text-academic-500'}`}
                                                            onClick={() => handleCommentVote(comment.id, -1)}
                                                            aria-label="Downvote comment"
                                                            type="button"
                                                        >
                                                            <ThumbsDown className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                {currentUser && (currentUser.username === commentAuthor || ['Administrator', 'Developer', 'Moderator'].includes(currentUser.role)) && (
                                                    <button className="btn btn-ghost text-red-600" onClick={() => handleDeleteComment(comment.id)} type="button">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-academic-800 mt-3 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {relatedPosts.length > 0 && (
                    <div className="pt-2 border-t border-academic-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-academic-900">More on this topic</h4>
                            <span className="text-sm text-academic-500">Similar discussions</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {relatedPosts.map((related) => (
                                <Link
                                    key={related.id}
                                    to={`/post/${related.id}`}
                                    className="min-h-44 rounded-xl border border-academic-200 bg-academic-50 p-4 flex flex-col justify-between hover:border-primary-200 hover:shadow-sm transition-all"
                                >
                                    <div className="space-y-2">
                                        <div className="text-xs uppercase tracking-wider text-academic-500">{related.topic || 'Uncategorized'}</div>
                                        <h5 className="text-base font-semibold text-academic-900 line-clamp-2">{related.title}</h5>
                                        <div className="max-h-24 overflow-hidden">
                                            <MarkdownContent content={related.content || ''} className="text-sm text-academic-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-xs text-academic-500">
                                        <span>@{related.author}</span>
                                        <span>{formatDateTime(related.created_at)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}