import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Trash2, TrendingUp, Filter, Eye, EyeOff, FolderPlus, ChevronDown, ChevronRight, Edit2, Zap } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import MarkdownContent from '../components/MarkdownContent';
import PostMediaCarousel from '../components/PostMediaCarousel';


const CONTENT_TYPE_OPTIONS = [
    { value: 'question', label: 'Question' },
    { value: 'theory', label: 'Theory' },
    { value: 'experiment', label: 'Experiment' },
    { value: 'claim', label: 'Claim' },
    { value: 'review', label: 'Review' },
    { value: 'concept', label: 'Concept (expl)' },
    { value: 'other', label: 'Other' },
];


function getContentTypeLabel(value) {
    const found = CONTENT_TYPE_OPTIONS.find((option) => option.value === value);
    return found ? found.label : 'Other';
}

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
    activeContentType,
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
    const [filterContentType, setFilterContentType] = useState('all');
    const [filterNoAI, setFilterNoAI] = useState(false); // false = all content, true = no AI only
    const [showPostForm, setShowPostForm] = useState(false);
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [topicDraft, setTopicDraft] = useState({ name: '', parent_id: '' });
    const [isPreviewingPost, setIsPreviewingPost] = useState(false);
    const [postTopicSearch, setPostTopicSearch] = useState('');
    const [isPostTopicPickerOpen, setIsPostTopicPickerOpen] = useState(false);
    const [expandedPostTopicIds, setExpandedPostTopicIds] = useState({});
    const [draggingMediaIndex, setDraggingMediaIndex] = useState(null);
    const postTopicPickerRef = useRef(null);

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

    useEffect(() => {
        setFilterContentType(activeContentType == null ? 'all' : String(activeContentType));
    }, [activeContentType]);

    // Fetch posts with new filters when sort or topic changes
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        if (handleFilterChange) {
            handleFilterChange({
                sort: newSort,
                topic_id: filterTopic === 'all' ? null : filterTopic,
                content_type: filterContentType === 'all' ? null : filterContentType,
                is_ai: filterNoAI ? false : null,
            });
        }
    };

    const handleTopicChange = (newTopic) => {
        setFilterTopic(newTopic);
        if (handleFilterChange) {
            handleFilterChange({
                sort: sortBy,
                topic_id: newTopic === 'all' ? null : newTopic,
                content_type: filterContentType === 'all' ? null : filterContentType,
                is_ai: filterNoAI ? false : null,
            });
        }
    };

    const handleContentTypeChange = (nextContentType) => {
        setFilterContentType(nextContentType);
        if (handleFilterChange) {
            handleFilterChange({
                sort: sortBy,
                topic_id: filterTopic === 'all' ? null : filterTopic,
                content_type: nextContentType === 'all' ? null : nextContentType,
                is_ai: filterNoAI ? false : null,
            });
        }
    };

    const handleNoAIToggle = () => {
        const newValue = !filterNoAI;
        setFilterNoAI(newValue);
        if (handleFilterChange) {
            handleFilterChange({
                sort: sortBy,
                topic_id: filterTopic === 'all' ? null : filterTopic,
                content_type: filterContentType === 'all' ? null : filterContentType,
                is_ai: newValue ? false : null,
            });
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

    const selectedPostTopic = useMemo(
        () => topics.find((topic) => String(topic.id) === String(formData.topic_id)) || null,
        [topics, formData.topic_id]
    );

    useEffect(() => {
        if (isPostTopicPickerOpen) {
            return;
        }
        setPostTopicSearch(selectedPostTopic?.name || '');
    }, [selectedPostTopic?.id, selectedPostTopic?.name, isPostTopicPickerOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (postTopicPickerRef.current && !postTopicPickerRef.current.contains(event.target)) {
                setIsPostTopicPickerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const postTopicTree = useMemo(() => {
        const childrenByParent = new Map();
        topics.forEach((topic) => {
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

    const selectedMediaFiles = Array.isArray(formData.media_files) ? formData.media_files : [];

    useEffect(() => {
        return () => {
            selectedMediaFiles.forEach((item) => {
                if (item?.preview_url) {
                    URL.revokeObjectURL(item.preview_url);
                }
            });
        };
    }, []);

    const handleMediaSelection = (event) => {
        const files = Array.from(event.target.files || []);
        const existing = selectedMediaFiles.slice();
        const mapped = files.map((file, index) => ({
            id: `${Date.now()}-${index}-${file.name}`,
            file,
            preview_url: URL.createObjectURL(file),
        }));
        const next = [...existing, ...mapped].slice(0, 8);
        setFormData({ ...formData, media_files: next });
        event.target.value = '';
    };

    const removeMediaFile = (indexToRemove) => {
        const target = selectedMediaFiles[indexToRemove];
        if (target?.preview_url) {
            URL.revokeObjectURL(target.preview_url);
        }
        setFormData({
            ...formData,
            media_files: selectedMediaFiles.filter((_, index) => index !== indexToRemove),
        });
    };

    const handleDragStartMedia = (index) => {
        setDraggingMediaIndex(index);
    };

    const handleDropMedia = (targetIndex) => {
        if (draggingMediaIndex == null || draggingMediaIndex === targetIndex) {
            setDraggingMediaIndex(null);
            return;
        }

        const reordered = selectedMediaFiles.slice();
        const [dragged] = reordered.splice(draggingMediaIndex, 1);
        reordered.splice(targetIndex, 0, dragged);

        setFormData({ ...formData, media_files: reordered });
        setDraggingMediaIndex(null);
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
                                <div ref={postTopicPickerRef} className="relative">
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
                                    placeholder="Enter discussion title..."
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
                                value={formData.content_type || 'question'}
                                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                                className="input"
                                required
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
                            />
                            {selectedMediaFiles.length > 0 && (
                                <>
                                    <p className="mt-2 text-xs text-academic-500">Drag thumbnails to reorder. The first item is shown by default on the post card.</p>
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {selectedMediaFiles.map((item, index) => {
                                            const file = item.file || item;
                                            const isVideo = (file.type || '').startsWith('video/');

                                            return (
                                                <div
                                                    key={item.id || `${file.name}-${index}`}
                                                    draggable
                                                    onDragStart={() => handleDragStartMedia(index)}
                                                    onDragOver={(event) => event.preventDefault()}
                                                    onDrop={() => handleDropMedia(index)}
                                                    className={`group rounded-lg border bg-white p-2 ${draggingMediaIndex === index ? 'border-primary-400' : 'border-academic-200'}`}
                                                >
                                                    <div className="relative mb-2 h-24 overflow-hidden rounded-md bg-academic-100">
                                                        {isVideo ? (
                                                            <video
                                                                src={item.preview_url}
                                                                className="h-full w-full object-cover"
                                                                muted
                                                            />
                                                        ) : (
                                                            <img
                                                                src={item.preview_url}
                                                                alt={file.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        )}
                                                        {index === 0 && (
                                                            <span className="absolute left-1 top-1 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-medium text-white">Visible first</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-academic-700 truncate" title={file.name}>{file.name}</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMediaFile(index)}
                                                        className="mt-1 text-[11px] text-red-600 hover:text-red-700"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {selectedMediaFiles.map((item, index) => (
                                            <div key={`name-${item.id || index}`} className="flex items-center justify-between rounded-md border border-academic-200 bg-academic-50 px-3 py-1.5 text-xs text-academic-700">
                                                <span className="truncate pr-3">{index + 1}. {(item.file || item).name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeMediaFile(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    </div>
                                </>
                            )}
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

                    <div className="flex items-center space-x-2 bg-white rounded-lg border border-academic-200 px-3 py-2">
                        <Filter className="w-4 h-4 text-academic-500" />
                        <select value={filterContentType} onChange={(e) => handleContentTypeChange(e.target.value)} className="text-sm border-0 focus:ring-0 bg-transparent">
                            <option value="all">All Types</option>
                            {CONTENT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={filterNoAI}
                        onClick={handleNoAIToggle}
                        className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors"
                        title="Toggle No AI filter"
                    >
                        <span className={`text-sm font-medium ${filterNoAI ? 'text-purple-700' : 'text-academic-600'}`}>
                            No AI
                        </span>
                        <span
                            className={`relative inline-flex h-7 w-14 items-center rounded-full border-2 transition-all ${
                                filterNoAI
                                    ? 'border-purple-500 bg-purple-100 shadow-lg shadow-purple-400/50'
                                    : 'border-academic-300 bg-white'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full transition-transform duration-200 ${
                                    filterNoAI
                                        ? 'translate-x-7 bg-purple-600'
                                        : 'translate-x-1 bg-academic-400'
                                }`}
                            />
                        </span>
                    </button>
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center rounded-full border border-academic-200 px-2 py-0.5">{post.topic || 'Uncategorized'}</span>
                                            <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-primary-700">{getContentTypeLabel(post.content_type)}</span>
                                            {post.is_ai && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-purple-700">
                                                    <Zap className="w-3 h-3" />
                                                    AI
                                                </span>
                                            )}
                                        </div>
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

                                    {Array.isArray(post.media_items) && post.media_items.length > 0 && (
                                        <PostMediaCarousel items={post.media_items} maxHeightClass="h-56 sm:h-64" />
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
                                        {currentUser && post.author_id === currentUser.id && (
                                            <Link
                                                to={`/post/${post.id}/edit`}
                                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                title="Edit post"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
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
