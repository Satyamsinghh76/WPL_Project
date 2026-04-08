// Centralized API configuration
// Accepts either:
// - VITE_API_URL=https://service.onrender.com
// - VITE_API_URL=https://service.onrender.com/api
const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function normalizeBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'http://localhost:8000/api';
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

function getErrorMessage(data, status) {
  const fallback = `Request failed with status ${status}`;
  const detail = data?.detail ?? data?.error;

  if (typeof detail === 'string' && detail.trim()) {
    const trimmed = detail.trim();

    // Some backend errors include a nested JSON string (for example, from upstream APIs).
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message.trim();
        if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error.trim();
        if (typeof parsed?.msg === 'string' && parsed.msg.trim()) return parsed.msg.trim();
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof detail === 'object' && detail) {
    if (typeof detail.message === 'string' && detail.message.trim()) return detail.message.trim();
    if (typeof detail.error === 'string' && detail.error.trim()) return detail.error.trim();
  }

  return fallback;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return {};
  }

  if (contentType.includes('application/json')) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = getErrorMessage(data, response.status);
      throw new Error(message);
    }
    return data;
  }

  const text = await response.text();
  if (!text && response.ok) {
    return {};
  }
  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return text;
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  return parseResponse(response);
}

// ============ TOPICS ============
export const fetchTopics = () =>
  request('/topics/');

export const searchAll = (query) =>
  request(`/search/?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  });

export const createTopic = (topicData, authHeaders) =>
  request('/topics/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(topicData),
  });

// ============ POSTS ============
export const fetchPosts = (userId = null, { sort = 'new', topic_id = null, content_type = null, is_ai = null, page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (userId) params.append('viewer_id', userId);
  params.append('sort', sort);
  if (topic_id && topic_id !== 'all') params.append('topic_id', topic_id);
  if (content_type && content_type !== 'all') params.append('content_type', content_type);
  if (is_ai !== null && is_ai !== undefined) params.append('is_ai', is_ai);
  params.append('page', page);
  
  const qs = params.toString();
  return request(`/posts/?${qs}`);
};

export const fetchPostsFeed = (userId = null, { sort = 'new', topic_id = null, content_type = null, is_ai = null, cursor = null, limit = 10 } = {}) => {
  const params = new URLSearchParams();
  if (userId) params.append('viewer_id', userId);
  params.append('sort', sort);
  if (topic_id && topic_id !== 'all') params.append('topic_id', topic_id);
  if (content_type && content_type !== 'all') params.append('content_type', content_type);
  if (is_ai !== null && is_ai !== undefined) params.append('is_ai', is_ai);
  if (cursor) params.append('cursor', cursor);
  params.append('limit', limit);

  return request(`/posts/feed/?${params.toString()}`);
};

export const fetchPost = (postId, userId = null) => {
  const params = new URLSearchParams();
  if (userId) params.append('viewer_id', userId);
  return request(`/posts/${postId}/?${params.toString()}`);
};

export const fetchRelatedPosts = (postId, { userId = null, limit = 3 } = {}) => {
  const params = new URLSearchParams();
  if (userId) params.append('viewer_id', userId);
  params.append('limit', limit);
  return request(`/posts/${postId}/related/?${params.toString()}`);
};

export const createPost = (postData, authHeaders) =>
  request('/posts/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(postData),
  });

export const editPost = (postId, postData, authHeaders) =>
  request(`/posts/${postId}/`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(postData),
  });

export const uploadPostMedia = (payload, authHeaders) =>
  request('/posts/upload-media/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

export const deletePost = (postId, authHeaders) =>
  request(`/posts/${postId}/`, {
    method: 'DELETE',
    headers: authHeaders,
  });

export const setPostVisibility = (postId, is_hidden, authHeaders) =>
  request(`/posts/${postId}/visibility/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ is_hidden }),
  });

export const votePost = (postId, voteData, authHeaders) =>
  request(`/posts/${postId}/vote/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(voteData),
  });

export const voteComment = (commentId, voteData, authHeaders) =>
  request(`/comments/${commentId}/vote/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(voteData),
  });

export const reportPost = (postId, reportData, authHeaders) =>
  request(`/posts/${postId}/report/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(reportData),
  });

// ============ COMMENTS ============
export const fetchComments = (postId, userId = null) => {
  const params = new URLSearchParams();
  if (userId) params.append('viewer_id', userId);
  const qs = params.toString();
  return request(`/posts/${postId}/comments/${qs ? `?${qs}` : ''}`);
};

export const createComment = (postId, commentData, authHeaders) =>
  request(`/posts/${postId}/comments/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(commentData),
  });

export const deleteComment = (commentId, authHeaders) =>
  request(`/comments/${commentId}/`, {
    method: 'DELETE',
    headers: authHeaders,
  });

export const reportUser = (userId, reportData, authHeaders) =>
  request(`/users/${userId}/report/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(reportData),
  });

// ============ AUTHENTICATION ============
export const login = (login, password) =>
  request('/accounts/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });

export const signup = (userData) =>
  request('/accounts/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

export const logout = (authHeaders) =>
  request('/accounts/logout/', {
    method: 'POST',
    headers: authHeaders,
  });

export const oauthLogin = (accessToken, password = '') =>
  request('/accounts/oauth/callback/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      ...(password ? { password } : {}),
    }),
  });

export const getMe = (authHeaders) =>
  request('/accounts/me/', {
    method: 'GET',
    headers: authHeaders,
  });

// ============ EMAIL & PASSWORD ============
export const sendVerification = (authHeaders) =>
  request('/accounts/send-verification/', {
    method: 'POST',
    headers: authHeaders,
  });

export const verifyEmail = (token) =>
  request('/accounts/verify-email/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

export const forgotPassword = (email) =>
  request('/accounts/forgot-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token, password) =>
  request('/accounts/reset-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

export const changePassword = (currentPassword, newPassword, authHeaders) =>
  request('/accounts/change-password/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

export const uploadProfilePicture = (payload, authHeaders) =>
  request('/accounts/upload-profile-picture/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

// ============ USERS ============
export const getUser = (userId, authHeaders) =>
  request(`/accounts/users/${userId}/`, {
    method: 'GET',
    headers: authHeaders,
  });

export const updateUser = (userId, userData, authHeaders) =>
  request(`/accounts/users/${userId}/`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify(userData),
  });

export const deleteUser = (userId, authHeaders) =>
  request(`/accounts/users/${userId}/`, {
    method: 'DELETE',
    headers: authHeaders,
  });

export const getUsers = (authHeaders) =>
  request('/accounts/users/', {
    method: 'GET',
    headers: authHeaders,
  });

export const getPublicProfile = (username) =>
  request(`/accounts/public/${username}/`, {
    method: 'GET',
  });

export const getReports = (authHeaders) =>
  request('/reports/', {
    method: 'GET',
    headers: authHeaders,
  });

// ============ CHAT ============
export const getConversations = (authHeaders, type = '') =>
  request(`/conversations/${type ? `?type=${type}` : ''}`, {
    method: 'GET',
    headers: authHeaders,
  });

export const startConversation = (userId, authHeaders) =>
  request('/conversations/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ user_id: userId, conv_type: 'direct' }),
  });

export const createGroupChat = (name, memberIds, authHeaders) =>
  request('/conversations/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ conv_type: 'group', name, member_ids: memberIds }),
  });

export const getMessages = (convoId, authHeaders) =>
  request(`/conversations/${convoId}/messages/`, {
    method: 'GET',
    headers: authHeaders,
  });

export const sendMessage = (convoId, content, authHeaders) =>
  request(`/conversations/${convoId}/messages/`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ content }),
  });

export const getUnreadCount = (authHeaders) =>
  request('/conversations/unread/', {
    method: 'GET',
    headers: authHeaders,
  });

export const getTopicRooms = (authHeaders) =>
  request('/topic-rooms/', {
    method: 'GET',
    headers: authHeaders,
  });

export const joinTopicRoom = (topicId, authHeaders) =>
  request('/topic-rooms/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ topic_id: topicId }),
  });

export const getChatUsers = (authHeaders) =>
  request('/chat-users/', {
    method: 'GET',
    headers: authHeaders,
  });

export { BASE_URL };
