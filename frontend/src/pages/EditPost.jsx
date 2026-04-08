import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Zap, ArrowLeft } from 'lucide-react';
import * as API from '../api';
import MarkdownContent from '../components/MarkdownContent';

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Unable to read file.'));
                return;
            }
            const base64 = result.split(',')[1] || '';
            resolve(base64);
        };
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
    });
}

const CONTENT_TYPE_OPTIONS = [
    { value: 'question', label: 'Question' },
    { value: 'theory', label: 'Theory' },
    { value: 'experiment', label: 'Experiment' },
    { value: 'claim', label: 'Claim' },
    { value: 'review', label: 'Review' },
    { value: 'concept', label: 'Concept (expl)' },
    { value: 'other', label: 'Other' },
];

export default function EditPost({ topics, currentUser, onPostUpdate }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isPreviewingPost, setIsPreviewingPost] = useState(false);
    const [postTopicSearch, setPostTopicSearch] = useState('');
    const [isPostTopicPickerOpen, setIsPostTopicPickerOpen] = useState(false);
    const [expandedPostTopicIds, setExpandedPostTopicIds] = useState({});
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        content_type: 'other',
        topic_id: '',
        references: [],
        is_ai: false,
        media_items: [],
        media_files: [],
    });

    const selectedNewMediaFiles = Array.isArray(formData.media_files) ? formData.media_files : [];
    const selectedExistingMedia = Array.isArray(formData.media_items) ? formData.media_items : [];

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

    const postTopicOptions = React.useMemo(() => {
        const childrenByParent = new Map();
        topics?.forEach((topic) => {
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

    const selectedPostTopic = React.useMemo(
        () => topics?.find((topic) => String(topic.id) === String(formData.topic_id)) || null,
        [topics, formData.topic_id]
    );

    const postTopicTree = React.useMemo(() => {
        const childrenByParent = new Map();
        topics?.forEach((topic) => {
            const key = topic.parent_id == null ? 'root' : String(topic.parent_id);
            if (!childrenByParent.has(key)) {
                childrenByParent.set(key, []);
            }
            childrenByParent.get(key).push(topic);
        });

        for (const topicList of childrenByParent.values()) {
            topicList.sort((a, b) => a.name.localeCompare(b.name));
        }

        const query = postTopicSearch.trim().toLowerCase();
        const collectVisible = (parentKey, depth) => {
            const children = childrenByParent.get(parentKey) || [];
            const visibleItems = [];

            children.forEach((topic) => {
                const childItems = collectVisible(String(topic.id), depth + 1);
                const matchesQuery = !query || topic.name.toLowerCase().includes(query);
                const isVisible = matchesQuery || childItems.length > 0;
                if (!isVisible) {
                    return;
                }

                visibleItems.push({
                    topic,
                    depth,
                    children: childItems,
                });
            });

            return visibleItems;
        };

        return {
            items: collectVisible('root', 0),
            hasQuery: Boolean(query),
        };
    }, [topics, postTopicSearch]);

    const togglePostTopicExpanded = (topicId) => {
        setExpandedPostTopicIds((prev) => ({
            ...prev,
            [topicId]: !prev[topicId],
        }));
    };

    const selectPostTopic = (topic) => {
        setFormData({ ...formData, topic_id: String(topic.id) });
        setPostTopicSearch(topic.name);
        setIsPostTopicPickerOpen(false);
    };

    const clearPostTopicSelection = () => {
        setFormData({ ...formData, topic_id: '' });
        setPostTopicSearch('');
    };

    useEffect(() => {
        if (isPostTopicPickerOpen) {
            return;
        }
        setPostTopicSearch(selectedPostTopic?.name || '');
    }, [selectedPostTopic?.id, selectedPostTopic?.name, isPostTopicPickerOpen]);

    useEffect(() => {
        const loadPost = async () => {
            try {
                setLoading(true);
                const data = await API.fetchPost(id, currentUser?.id);
                setPost(data);
                setFormData({
                    title: data.title,
                    content: data.content,
                    content_type: data.content_type || 'other',
                    topic_id: String(data.topic_id || ''),
                    references: data.references || [],
                    is_ai: data.is_ai || false,
                    media_items: Array.isArray(data.media_items)
                        ? data.media_items.map((item) => ({
                              path: item.path,
                              kind: item.kind,
                              content_type: item.content_type,
                              signed_url: item.signed_url,
                          }))
                        : [],
                    media_files: [],
                });
                setPostTopicSearch(data.topic || '');
            } catch (err) {
                setError(err.message || 'Failed to load post');
                setTimeout(() => navigate(`/post/${id}`), 2000);
            } finally {
                setLoading(false);
            }
        };

        if (id && currentUser) {
            loadPost();
        }
    }, [id, currentUser, navigate]);

    useEffect(() => {
        return () => {
            selectedNewMediaFiles.forEach((item) => {
                if (item?.preview_url) {
                    URL.revokeObjectURL(item.preview_url);
                }
            });
        };
    }, []);

    const handleMediaSelection = (event) => {
        const files = Array.from(event.target.files || []);
        const existingCount = selectedExistingMedia.length + selectedNewMediaFiles.length;
        const remainingSlots = Math.max(8 - existingCount, 0);

        const mapped = files.slice(0, remainingSlots).map((file, index) => ({
            id: `${Date.now()}-${index}-${file.name}`,
            file,
            preview_url: URL.createObjectURL(file),
        }));

        setFormData((prev) => ({
            ...prev,
            media_files: [...selectedNewMediaFiles, ...mapped],
        }));
        event.target.value = '';
    };

    const removeExistingMedia = (indexToRemove) => {
        setFormData((prev) => ({
            ...prev,
            media_items: (prev.media_items || []).filter((_, index) => index !== indexToRemove),
        }));
    };

    const removeNewMedia = (indexToRemove) => {
        const item = selectedNewMediaFiles[indexToRemove];
        if (item?.preview_url) {
            URL.revokeObjectURL(item.preview_url);
        }
        setFormData((prev) => ({
            ...prev,
            media_files: (prev.media_files || []).filter((_, index) => index !== indexToRemove),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to edit a post.');
            return;
        }

        if (!post || post.author_id !== currentUser.id) {
            alert('You can only edit your own posts.');
            return;
        }

        try {
            setSaving(true);
            const references = formData.references.filter((ref) => ref.url && ref.url.trim()).map((ref) => ({
                title: ref.title?.trim() || 'Reference',
                url: ref.url.trim(),
            }));

            let mediaItems = selectedExistingMedia.map((item) => ({
                path: item.path,
                kind: item.kind,
                content_type: item.content_type,
            }));

            if (selectedNewMediaFiles.length > 0) {
                const filesPayload = await Promise.all(
                    selectedNewMediaFiles.map(async (entry) => ({
                        filename: entry.file.name,
                        content_type: entry.file.type || 'application/octet-stream',
                        data_base64: await fileToBase64(entry.file),
                    }))
                );

                const uploadResult = await API.uploadPostMedia({ files: filesPayload }, authHeaders(true));
                const uploadedMediaItems = (uploadResult.items || []).map((item) => ({
                    path: item.path,
                    kind: item.kind,
                    content_type: item.content_type,
                }));
                mediaItems = [...mediaItems, ...uploadedMediaItems];
            }

            const data = await API.editPost(id, {
                title: formData.title,
                content: formData.content,
                content_type: formData.content_type || 'question',
                topic_id: formData.topic_id || null,
                references: references.length > 0 ? references : [{ title: 'Reference', url: 'https://scholr.com' }],
                is_ai: formData.is_ai || false,
                media_items: mediaItems,
            }, authHeaders(true));

            if (onPostUpdate) {
                onPostUpdate(data);
            }

            navigate(`/post/${id}`);
        } catch (err) {
            setError(err.message || 'Failed to save post');
        } finally {
            setSaving(false);
        }
    };

    const renderPostTopicNode = (node) => {
        const hasChildren = node.children.length > 0;
        const shouldExpand = postTopicTree.hasQuery || expandedPostTopicIds[node.topic.id] || false;

        return (
            <div key={node.topic.id}>
                <div
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        String(formData.topic_id) === String(node.topic.id)
                            ? 'bg-primary-100 text-primary-800'
                            : 'hover:bg-academic-100 text-academic-800'
                    }`}
                    style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                togglePostTopicExpanded(node.topic.id);
                            }}
                            className="rounded p-0.5 text-academic-500 hover:bg-academic-200"
                            aria-label={shouldExpand ? 'Collapse topic' : 'Expand topic'}
                        >
                            {shouldExpand ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    <button
                        type="button"
                        onClick={() => selectPostTopic(node.topic)}
                        className="flex-1 text-left text-sm"
                    >
                        {node.topic.name}
                    </button>
                </div>

                {hasChildren && shouldExpand && (
                    <div>{node.children.map((child) => renderPostTopicNode(child))}</div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="card text-center py-10 text-academic-600">Loading post...</div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="card text-center py-10">
                    <p className="text-academic-600 mb-4">{error || 'Post not found.'}</p>
                    <Link to={`/post/${id}`} className="btn btn-primary">
                        Back to post
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Link to={`/post/${id}`} className="flex items-center gap-2 text-primary-700 hover:text-primary-900 mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to post
            </Link>

            <div className="card card-hover animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-academic-900">Edit Discussion</h2>
                </div>

                {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Topic</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={postTopicSearch}
                                    onFocus={() => setIsPostTopicPickerOpen(true)}
                                    onChange={(e) => {
                                        setPostTopicSearch(e.target.value);
                                        setIsPostTopicPickerOpen(true);
                                    }}
                                    placeholder="Type to search topic..."
                                    className="input pr-10"
                                />

                                {(postTopicSearch || formData.topic_id) && (
                                    <button
                                        type="button"
                                        onClick={clearPostTopicSelection}
                                        className="absolute inset-y-0 right-8 text-academic-400 hover:text-academic-700"
                                        aria-label="Clear selected topic"
                                    >
                                        ×
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsPostTopicPickerOpen((prev) => !prev)}
                                    className="absolute inset-y-0 right-2 text-academic-500 hover:text-academic-800"
                                    aria-label="Toggle topic list"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>

                                {isPostTopicPickerOpen && (
                                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-academic-200 bg-white p-2 shadow-lg">
                                        <button
                                            type="button"
                                            onClick={clearPostTopicSelection}
                                            className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                                                !formData.topic_id
                                                    ? 'bg-primary-100 text-primary-800'
                                                    : 'text-academic-700 hover:bg-academic-100'
                                            }`}
                                        >
                                            No topic
                                        </button>

                                        {postTopicTree.items.length > 0 ? (
                                            <div className="mt-1 space-y-0.5">
                                                {postTopicTree.items.map((node) => renderPostTopicNode(node))}
                                            </div>
                                        ) : (
                                            <div className="px-2 py-2 text-sm text-academic-500">No topics match your search.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-academic-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Content Type</label>
                        <select
                            value={formData.content_type}
                            onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                            className="input"
                        >
                            {CONTENT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
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
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="textarea"
                                rows={7}
                                required
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">References (at least one required)</label>
                        <div className="space-y-2">
                            {(formData.references || [{ title: '', url: '' }]).map((ref, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Reference title (e.g., 'Smith et al., 2023')"
                                        value={ref.title || ''}
                                        onChange={(e) => {
                                            const updated = [...(formData.references || [])];
                                            updated[idx] = { ...ref, title: e.target.value };
                                            setFormData({ ...formData, references: updated });
                                        }}
                                        className="input flex-1"
                                    />
                                    <input
                                        type="url"
                                        placeholder="URL (required)"
                                        value={ref.url || ''}
                                        onChange={(e) => {
                                            const updated = [...(formData.references || [])];
                                            updated[idx] = { ...ref, url: e.target.value };
                                            setFormData({ ...formData, references: updated });
                                        }}
                                        className="input flex-1"
                                        required
                                    />
                                    {(formData.references || []).length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = (formData.references || []).filter((_, i) => i !== idx);
                                                setFormData({ ...formData, references: updated });
                                            }}
                                            className="btn btn-sm btn-outline text-red-600 hover:bg-red-50"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    const updated = [...(formData.references || [])];
                                    updated.push({ title: '', url: '' });
                                    setFormData({ ...formData, references: updated });
                                }}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                + Add another reference
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_ai || false}
                                onChange={(e) => setFormData({ ...formData, is_ai: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-academic-700">Mark as AI-generated content</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-academic-700 mb-1">Images or videos (optional, up to 8)</label>
                        <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaSelection}
                            className="input"
                            disabled={selectedExistingMedia.length + selectedNewMediaFiles.length >= 8}
                        />

                        {selectedExistingMedia.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-academic-500">Current media</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {selectedExistingMedia.map((item, index) => {
                                        const isVideo = (item.kind || '').toLowerCase() === 'video' || (item.content_type || '').startsWith('video/');
                                        return (
                                            <div key={`${item.path}-${index}`} className="rounded-lg border border-academic-200 bg-white p-2">
                                                <div className="relative mb-2 h-24 overflow-hidden rounded-md bg-academic-100">
                                                    {isVideo ? (
                                                        <video src={item.signed_url} className="h-full w-full object-cover" muted />
                                                    ) : (
                                                        <img src={item.signed_url} alt="Existing media" className="h-full w-full object-cover" />
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingMedia(index)}
                                                    className="text-[11px] text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {selectedNewMediaFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-academic-500">New media to upload</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {selectedNewMediaFiles.map((item, index) => {
                                        const file = item.file;
                                        const isVideo = (file.type || '').startsWith('video/');
                                        return (
                                            <div key={item.id || `${file.name}-${index}`} className="rounded-lg border border-academic-200 bg-white p-2">
                                                <div className="relative mb-2 h-24 overflow-hidden rounded-md bg-academic-100">
                                                    {isVideo ? (
                                                        <video src={item.preview_url} className="h-full w-full object-cover" muted />
                                                    ) : (
                                                        <img src={item.preview_url} alt={file.name} className="h-full w-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-academic-700 truncate" title={file.name}>{file.name}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewMedia(index)}
                                                    className="mt-1 text-[11px] text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Link to={`/post/${id}`} className="btn btn-outline">
                            Cancel
                        </Link>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
