import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Sparkles,
    User as UserIcon,
    Settings as SettingsIcon,
    LogOut,
    X,
    Search,
    Bell,
    ChevronDown,
    Home as HomeIcon,
    MessageSquare,
    Shield,
    Moon,
    Sun,
    PanelRight,
} from 'lucide-react';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import ModerationReports from './pages/ModerationReports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import AdminUsers from './pages/AdminUsers';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import SearchResults from './pages/SearchResults';
import Messages from './pages/Messages';
import * as API from './api';
import './index.css';
const USER_STORAGE_KEY = 'scholr_current_user';
const THEME_STORAGE_KEY = 'scholr_theme';
const ALL_ROLES = ['Administrator', 'Developer', 'Moderator', 'Verified User', 'General User'];

function getSwitchableRoles(baseRole) {
    if (baseRole === 'Administrator') {
        return ALL_ROLES;
    }
    if (baseRole === 'Developer') {
        return ['Verified User', 'General User'];
    }
    return [];
}

function SearchInput({
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    feedSort,
    handleFilterChange,
    currentUser,
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (location.pathname === '/search') {
            setIsDropdownOpen(false);
        }
    }, [location.pathname]);

    const goToSearchPage = () => {
        const q = searchQuery.trim();
        if (q.length < 2) {
            return;
        }
        setIsDropdownOpen(false);
        navigate(`/search?q=${encodeURIComponent(q)}`);
    };

    return (
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-academic-400 w-4 h-4" />
            <input
                type="text"
                placeholder="Search discussions, topics, authors..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                }}
                onFocus={() => {
                    if (searchQuery.trim().length >= 2 && location.pathname !== '/search') {
                        setIsDropdownOpen(true);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        goToSearchPage();
                    }
                }}
                className="w-full pl-10 pr-4 py-2 border border-academic-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            {isDropdownOpen && location.pathname !== '/search' && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white border border-academic-200 rounded-lg shadow-lg p-3 z-50 max-h-96 overflow-y-auto">
                    {isSearching && <div className="text-sm text-academic-500">Searching...</div>}

                    {!isSearching && searchResults.topics.length === 0 && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                        <div className="text-sm text-academic-500">No results found.</div>
                    )}

                    {!isSearching && searchResults.topics.length > 0 && (
                        <div className="mb-3">
                            <div className="text-xs font-semibold uppercase tracking-wider text-academic-500 mb-1">Topics</div>
                            <div className="space-y-1">
                                {searchResults.topics.map((topic) => (
                                    <button
                                        key={`topic-${topic.id}`}
                                        onClick={() => {
                                            handleFilterChange({ sort: feedSort, topic_id: topic.id });
                                            setSearchQuery('');
                                            navigate('/');
                                        }}
                                        className="w-full text-left px-2 py-1 rounded hover:bg-academic-100 text-sm text-academic-700"
                                    >
                                        {topic.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isSearching && searchResults.posts.length > 0 && (
                        <div className="mb-3">
                            <div className="text-xs font-semibold uppercase tracking-wider text-academic-500 mb-1">Posts</div>
                            <div className="space-y-1">
                                {searchResults.posts.map((post) => (
                                    <Link
                                        key={`post-${post.id}`}
                                        to={`/post/${post.id}`}
                                        onClick={() => setSearchQuery('')}
                                        className="block px-2 py-1 rounded hover:bg-academic-100 text-sm"
                                    >
                                        <div className="text-academic-800 line-clamp-1">{post.title}</div>
                                        <div className="text-xs text-academic-500">by @{post.author}{post.topic ? ` in ${post.topic}` : ''}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isSearching && searchResults.users.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-academic-500 mb-1">Users</div>
                            <div className="space-y-1">
                                {searchResults.users.map((user) => (
                                    <Link
                                        key={`user-${user.id}`}
                                        to={currentUser?.username === user.username ? '/profile' : `/profile/${user.username}`}
                                        onClick={() => setSearchQuery('')}
                                        className="block px-2 py-1 rounded hover:bg-academic-100 text-sm"
                                    >
                                        <div className="text-academic-800">@{user.username}</div>
                                        <div className="text-xs text-academic-500 line-clamp-1">{user.full_name}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={goToSearchPage}
                        className="mt-3 w-full text-sm text-primary-700 hover:text-primary-900 font-medium"
                    >
                        View all results
                    </button>
                </div>
            )}
        </div>
    );
}

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [topics, setTopics] = useState([]);
    const [formData, setFormData] = useState({ title: '', topic_id: '', content: '', refs: '' });
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ topics: [], posts: [], users: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);
    const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');
    const [feedSort, setFeedSort] = useState('new');
    const [feedTopicId, setFeedTopicId] = useState(null);
    const [feedCursor, setFeedCursor] = useState(null);
    const [feedHasMore, setFeedHasMore] = useState(true);
    const [expandedTopicIds, setExpandedTopicIds] = useState({});

    useEffect(() => {
        const hash = window.location.hash || '';
        if (!hash.startsWith('#/')) {
            return;
        }

        const route = hash.slice(1);
        if (route.startsWith('/verify-email') || route.startsWith('/reset-password')) {
            window.history.replaceState({}, '', route);
        }
    }, []);

    const role = currentUser?.acting_role || currentUser?.role || 'General User';
    const isLoggedIn = Boolean(currentUser);
    const switchableRoles = getSwitchableRoles(currentUser?.role).filter((roleName) => roleName !== currentUser?.role);
    const canSwitchRole = isLoggedIn && switchableRoles.length > 0;
    const canModerateReports = ['Administrator', 'Developer', 'Moderator'].includes(role);
    const isAdminRole = role === 'Administrator';

    const authHeaders = (hasJson = false) => {
        const headers = {};
        if (hasJson) {
            headers['Content-Type'] = 'application/json';
        }
        if (currentUser?.token) {
            headers.Authorization = `Bearer ${currentUser.token}`;
        }
        if (currentUser?.acting_role) {
            headers['X-Acting-Role'] = currentUser.acting_role;
        }
        return headers;
    };

    const fetchTopics = async () => {
        try {
            const data = await API.fetchTopics();
            setTopics(data.results || []);
        } catch {
            return;
        }
    };

    const fetchFeedPosts = useCallback(async (userId = currentUser?.id, { sort = feedSort, topic_id = feedTopicId, cursor = null, append = false, limit = 10 } = {}) => {
        const normalizedTopicId = topic_id === 'all' || topic_id === '' ? null : topic_id;

        if (append) {
            setIsLoadingMorePosts(true);
        } else {
            setIsLoadingPosts(true);
            setFeedCursor(null);
            setFeedHasMore(true);
        }

        setFeedSort(sort);
        setFeedTopicId(normalizedTopicId);

        try {
            const data = await API.fetchPostsFeed(userId, {
                sort,
                topic_id: normalizedTopicId,
                cursor,
                limit,
            });

            const nextPosts = data.posts || [];
            setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
            setFeedCursor(data.next_cursor || null);
            setFeedHasMore(Boolean(data.has_more));
            setFeedSort(sort);
            setFeedTopicId(normalizedTopicId);
        } catch {
            if (!append) {
                setPosts([]);
                setFeedCursor(null);
                setFeedHasMore(false);
            }
        } finally {
            if (append) {
                setIsLoadingMorePosts(false);
            } else {
                setIsLoadingPosts(false);
            }
        }
    }, [currentUser?.id, feedSort, feedTopicId]);

    useEffect(() => {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        if (!raw) {
            return;
        }
        try {
            setCurrentUser(JSON.parse(raw));
        } catch {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('theme-switching');
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                root.classList.remove('theme-switching');
            });
        });
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        fetchTopics();
    }, []);

    useEffect(() => {
        fetchFeedPosts(currentUser?.id, { sort: feedSort, topic_id: feedTopicId, cursor: null, append: false });
    }, [currentUser?.id]);

    const filteredPosts = posts;

    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults({ topics: [], posts: [], users: [] });
            setIsSearching(false);
            return;
        }

        let cancelled = false;
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const data = await API.searchAll(query);
                if (!cancelled) {
                    setSearchResults({
                        topics: data.topics || [],
                        posts: data.posts || [],
                        users: data.users || [],
                    });
                }
            } catch {
                if (!cancelled) {
                    setSearchResults({ topics: [], posts: [], users: [] });
                }
            } finally {
                if (!cancelled) {
                    setIsSearching(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchQuery]);

    const handlePostForm = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to publish a discussion.');
            return false;
        }

        try {
            const data = await API.createPost({
                title: formData.title,
                content: formData.content,
                references: formData.refs,
                topic_id: formData.topic_id || null,
            }, authHeaders(true));

            setPosts((prev) => [data, ...prev]);
            setFormData({ title: '', topic_id: '', content: '', refs: '' });
            return true;
        } catch (error) {
            alert('Unable to publish post.');
            return false;
        }
    };

    const handleDelete = async (id) => {
        if (!currentUser) {
            return;
        }

        try {
            await API.deletePost(id, authHeaders());
            setPosts((prev) => prev.filter((post) => post.id !== id));
        } catch (error) {
            alert('Unable to delete post.');
        }
    };

    const handleToggleHidden = async (id, isHidden) => {
        if (!currentUser) {
            return;
        }

        try {
            const updated = await API.setPostVisibility(id, isHidden, authHeaders(true));
            if (updated.is_hidden && !['Administrator', 'Developer', 'Moderator'].includes(role)) {
                setPosts((prev) => prev.filter((post) => post.id !== id));
                return;
            }
            setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, ...updated } : post)));
        } catch (error) {
            alert('Unable to update post visibility.');
        }
    };

    const handleFilterChange = useCallback(async ({ sort = 'new', topic_id = null }) => {
        await fetchFeedPosts(currentUser?.id, { sort, topic_id, cursor: null, append: false });
    }, [currentUser?.id, fetchFeedPosts]);

    const handleLoadMorePosts = useCallback(async () => {
        if (isLoadingPosts || isLoadingMorePosts || !feedHasMore || !feedCursor) {
            return;
        }

        await fetchFeedPosts(currentUser?.id, {
            sort: feedSort,
            topic_id: feedTopicId,
            cursor: feedCursor,
            append: true,
        });
    }, [currentUser?.id, feedCursor, feedHasMore, feedSort, feedTopicId, fetchFeedPosts, isLoadingMorePosts, isLoadingPosts]);

    const toggleTopicExpanded = (topicId) => {
        setExpandedTopicIds((prev) => ({
            ...prev,
            [topicId]: !prev[topicId],
        }));
    };

    const resetHomeFeed = async () => {
        setSearchQuery('');
        await fetchFeedPosts(currentUser?.id, { sort: 'new', topic_id: null, cursor: null, append: false });
    };

    const handleVote = async (postId, value) => {
        if (!currentUser) {
            alert('Please log in to vote.');
            return;
        }

        try {
            const data = await API.votePost(postId, { value }, authHeaders(true));

            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId
                        ? {
                              ...post,
                              score: data.score,
                              user_vote: data.user_vote,
                          }
                        : post
                )
            );
        } catch (error) {
            alert('Vote failed.');
        }
    };

    const handleCommentVote = async (commentId, value) => {
        if (!currentUser) {
            alert('Please log in to vote.');
            return null;
        }

        try {
            return await API.voteComment(commentId, { value }, authHeaders(true));
        } catch (error) {
            alert(error?.message || 'Comment vote failed.');
            return null;
        }
    };

    const handleCreateTopic = async ({ name, parent_id }) => {
        if (!currentUser) {
            alert('Please log in as admin to add topics.');
            return false;
        }

        try {
            const data = await API.createTopic({
                name,
                parent_id: parent_id || null,
            }, authHeaders(true));

            setTopics((prev) => [...prev, data]);
            return true;
        } catch (error) {
            alert(error?.message || 'Unable to create topic.');
            return false;
        }
    };

    const handleLoginSuccess = (user) => {
        const normalizedUser = {
            ...user,
            original_role: user.original_role || user.role,
            acting_role: user.acting_role || null,
        };
        setCurrentUser(normalizedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    };

    const handleRoleSwitch = (nextRole) => {
        if (!currentUser) {
            return;
        }

        const updatedUser = {
            ...currentUser,
            acting_role: nextRole || null,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    };

    const handleLogout = async () => {
        if (currentUser?.token) {
            try {
                await API.logout(authHeaders());
            } catch {
                // Ignore network failures and clear client session anyway.
            }
        }
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
    };

    const parentTopicMap = topics.reduce((acc, topic) => {
        const key = topic.parent_id || 0;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(topic);
        return acc;
    }, {});

    return (
        <Router>
            <div className="min-h-screen bg-academic-50">
                <header className="sticky top-0 z-50 bg-white border-b border-academic-200 backdrop-blur-lg bg-opacity-90">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center">
                                <Link to="/" className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gradient">Scholr</span>
                                </Link>
                            </div>

                            <div className="hidden md:flex flex-1 max-w-md mx-8">
                                <SearchInput
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    isSearching={isSearching}
                                    searchResults={searchResults}
                                    feedSort={feedSort}
                                    handleFilterChange={handleFilterChange}
                                    currentUser={currentUser}
                                />
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="hidden md:flex items-center space-x-2">
                                    <button
                                        className="btn btn-ghost"
                                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                        onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                                    >
                                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </button>
                                    {isLoggedIn && (
                                        <Link to="/settings" className="relative p-2 rounded-lg hover:bg-academic-100 transition-colors" title="Settings">
                                            <SettingsIcon className="w-5 h-5 text-academic-600" />
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    {isLoggedIn ? (
                                        <>
                                            <Link to="/profile" className="md:hidden p-2 rounded-lg hover:bg-academic-100 transition-colors" title="Profile">
                                                <UserIcon className="w-5 h-5 text-academic-600" />
                                            </Link>
                                            <div className="hidden md:flex items-center space-x-2">
                                                <Link to="/profile" className="btn btn-ghost" title="Profile">
                                                    <UserIcon className="w-4 h-4" />
                                                </Link>
                                                <button onClick={handleLogout} className="btn btn-ghost text-red-600 hover:text-red-700" title="Log out">
                                                    <LogOut className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setRightPanelOpen(true)}
                                                className="md:hidden p-2 rounded-lg hover:bg-academic-100 transition-colors"
                                                title="Open menu"
                                            >
                                                <PanelRight className="w-5 h-5 text-academic-600" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Link to="/login" className="btn btn-outline">
                                                Log In
                                            </Link>
                                            <Link to="/signup" className="btn btn-primary">
                                                Sign Up
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex max-w-7xl mx-auto">
                    <aside className="hidden lg:block lg:sticky lg:top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-academic-200">
                        <div className="h-full overflow-y-auto p-6">
                            <nav className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-semibold text-academic-500 uppercase tracking-wider mb-3">Navigation</h3>
                                    <div className="space-y-1">
                                        <Link to="/" onClick={resetHomeFeed} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700 transition-colors">
                                            <HomeIcon className="w-4 h-4" />
                                            <span>Home Feed</span>
                                        </Link>
                                        <Link to="/messages" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700 transition-colors">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>Messages</span>
                                        </Link>
                                        {isAdminRole && (
                                            <Link to="/admin/users" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700 transition-colors">
                                                <Shield className="w-4 h-4" />
                                                <span>Admin Users</span>
                                            </Link>
                                        )}
                                        {canModerateReports && (
                                            <Link to="/moderation/reports" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700 transition-colors">
                                                <Bell className="w-4 h-4" />
                                                <span>Reports</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold text-academic-500 uppercase tracking-wider mb-3">Explore Topics</h3>
                                    <div className="space-y-2">
                                        {(parentTopicMap[0] || []).map((topic) => (
                                            <div key={topic.id}>
                                                <div className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700 transition-colors">
                                                    <button
                                                        onClick={() => handleFilterChange({ sort: feedSort, topic_id: topic.id })}
                                                        className="flex items-center flex-1 text-left"
                                                    >
                                                        <span className="font-medium">{topic.name}</span>
                                                    </button>
                                                    {(parentTopicMap[topic.id] || []).length > 0 && (
                                                        <button
                                                            onClick={() => toggleTopicExpanded(topic.id)}
                                                            className="ml-2 p-1 rounded hover:bg-academic-200"
                                                            title={expandedTopicIds[topic.id] ? 'Collapse subtopics' : 'Expand subtopics'}
                                                        >
                                                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedTopicIds[topic.id] ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    )}
                                                </div>
                                                {(parentTopicMap[topic.id] || []).length > 0 && expandedTopicIds[topic.id] && (
                                                    <div className="ml-6 mt-1 space-y-1">
                                                        {(parentTopicMap[topic.id] || []).map((sub) => (
                                                            <button
                                                                key={sub.id}
                                                                onClick={() => handleFilterChange({ sort: feedSort, topic_id: sub.id })}
                                                                className="block w-full text-left px-3 py-1 text-sm text-academic-600 hover:text-academic-900 hover:bg-academic-50 rounded transition-colors"
                                                            >
                                                                {sub.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {topics.length === 0 && <div className="text-sm text-academic-500 px-3">No topics yet.</div>}
                                    </div>
                                </div>
                            </nav>
                        </div>
                    </aside>

                    <main className="flex-1 p-3 sm:p-5 lg:p-8 pb-24 md:pb-8">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <Home
                                        posts={filteredPosts}
                                        activeSort={feedSort}
                                        activeTopicId={feedTopicId}
                                        role={role}
                                        currentUser={currentUser}
                                        topics={topics}
                                        isLoadingPosts={isLoadingPosts}
                                        isLoadingMorePosts={isLoadingMorePosts}
                                        feedHasMore={feedHasMore}
                                        handleDelete={handleDelete}
                                        handleToggleHidden={handleToggleHidden}
                                        handlePostForm={handlePostForm}
                                        handleVote={handleVote}
                                        handleLoadMorePosts={handleLoadMorePosts}
                                        handleCreateTopic={handleCreateTopic}
                                        handleFilterChange={handleFilterChange}
                                        formData={formData}
                                        setFormData={setFormData}
                                    />
                                }
                            />
                            <Route path="/post/:id" element={<PostDetail posts={posts} currentUser={currentUser} onVote={handleVote} onCommentVote={handleCommentVote} />} />
                            <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />
                            <Route path="/signup" element={<Signup onLogin={handleLoginSuccess} />} />
                            <Route path="/auth/callback" element={<AuthCallback onLogin={handleLoginSuccess} />} />
                            <Route path="/admin/users" element={<AdminUsers currentUser={currentUser} onUserUpdate={handleLoginSuccess} />} />
                            <Route path="/profile" element={<Profile currentUser={currentUser} posts={posts} onUserUpdate={handleLoginSuccess} />} />
                            <Route path="/profile/:username" element={<PublicProfile posts={posts} currentUser={currentUser} />} />
                            <Route path="/moderation/reports" element={<ModerationReports currentUser={currentUser} />} />
                            <Route path="/settings" element={<Settings currentUser={currentUser} authHeaders={authHeaders} />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/search" element={<SearchResults currentUser={currentUser} onTopicSelect={(topicId) => handleFilterChange({ sort: 'new', topic_id: topicId })} />} />
                            <Route path="/messages" element={<Messages currentUser={currentUser} authHeaders={authHeaders} onAuthExpired={handleLogout} />} />
                        </Routes>
                    </main>
                </div>

                {rightPanelOpen && (
                    <>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-[60] md:hidden" onClick={() => setRightPanelOpen(false)} />
                        <aside className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white border-l border-academic-200 z-[70] p-5 overflow-y-auto md:hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-academic-900">Quick Panel</h3>
                                <button onClick={() => setRightPanelOpen(false)} className="p-2 rounded-lg hover:bg-academic-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <Link to="/settings" onClick={() => setRightPanelOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-academic-200 hover:bg-academic-50 text-academic-700">
                                    <SettingsIcon className="w-4 h-4" />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-academic-200 hover:bg-academic-50 text-academic-700"
                                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                                    onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                                >
                                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                {isLoggedIn && (
                                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-academic-200 hover:bg-academic-50 text-academic-700">
                                        <Bell className="w-4 h-4" />
                                        <span>Notifications</span>
                                    </button>
                                )}
                                {canModerateReports && (
                                    <Link to="/moderation/reports" onClick={() => setRightPanelOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-academic-200 hover:bg-academic-50 text-academic-700">
                                        <Bell className="w-4 h-4" />
                                        <span>Reports</span>
                                    </Link>
                                )}
                                {isAdminRole && (
                                    <Link to="/admin/users" onClick={() => setRightPanelOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-academic-200 hover:bg-academic-50 text-academic-700">
                                        <Shield className="w-4 h-4" />
                                        <span>Admin Users</span>
                                    </Link>
                                )}
                                {canSwitchRole && (
                                    <select
                                        value={currentUser?.acting_role || ''}
                                        onChange={(e) => handleRoleSwitch(e.target.value)}
                                        className="w-full text-sm border border-academic-200 rounded-lg px-3 py-2 bg-white text-academic-700"
                                        title="Switch role simulation"
                                    >
                                        <option value="">Use {currentUser.role}</option>
                                        {switchableRoles.map((roleOption) => (
                                            <option key={roleOption} value={roleOption}>
                                                Use {roleOption}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div className="pt-2 border-t border-academic-200">
                                    <h4 className="text-xs font-semibold text-academic-500 uppercase tracking-wider mb-2">Explore Topics</h4>
                                    <div className="max-h-56 overflow-y-auto space-y-1">
                                        <button
                                            onClick={async () => {
                                                await resetHomeFeed();
                                                setRightPanelOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700"
                                        >
                                            All Topics
                                        </button>
                                        {(parentTopicMap[0] || []).map((topic) => (
                                            <button
                                                key={topic.id}
                                                onClick={async () => {
                                                    await handleFilterChange({ sort: feedSort, topic_id: topic.id });
                                                    setRightPanelOpen(false);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-academic-100 text-academic-700"
                                            >
                                                {topic.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                                    <LogOut className="w-4 h-4" />
                                    <span>Log out</span>
                                </button>
                            </div>
                        </aside>
                    </>
                )}

                {isLoggedIn && (
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-academic-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-[0_-6px_18px_rgba(15,23,42,0.08)] px-4 py-2">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <NavLink to="/" onClick={resetHomeFeed} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${isActive ? 'text-primary-700 bg-primary-100 dark:text-blue-200 dark:bg-slate-800' : 'text-academic-700 dark:text-slate-300'}`}>
                                <HomeIcon className="w-4 h-4" />
                                <span>Home</span>
                            </NavLink>
                            <NavLink to="/search" className={({ isActive }) => `flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${isActive ? 'text-primary-700 bg-primary-100 dark:text-blue-200 dark:bg-slate-800' : 'text-academic-700 dark:text-slate-300'}`}>
                                <Search className="w-4 h-4" />
                                <span>Search</span>
                            </NavLink>
                            <NavLink to="/messages" className={({ isActive }) => `flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${isActive ? 'text-primary-700 bg-primary-100 dark:text-blue-200 dark:bg-slate-800' : 'text-academic-700 dark:text-slate-300'}`}>
                                <MessageSquare className="w-4 h-4" />
                                <span>Messages</span>
                            </NavLink>
                        </div>
                    </nav>
                )}
            </div>
        </Router>
    );
}

export default App;
