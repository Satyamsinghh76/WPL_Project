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
      const message = data?.detail || data?.error || `Request failed with status ${response.status}`;
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

export const createTopic = (topicData, authHeaders) =>
  request('/topics/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(topicData),
  });

// ============ POSTS ============
export const fetchPosts = (userId = null) => {
  const url = userId 
    ? `/posts/?viewer_id=${userId}` 
    : '/posts/';
  return request(url);
};

export const createPost = (postData, authHeaders) =>
  request('/posts/', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(postData),
  });

export const deletePost = (postId, authHeaders) =>
  request(`/posts/${postId}/`, {
    method: 'DELETE',
    headers: authHeaders,
  });

export const votePost = (postId, voteData, authHeaders) =>
  request(`/posts/${postId}/vote/`, {
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
export const fetchComments = (postId) =>
  request(`/posts/${postId}/comments/`);

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
export const login = (username, password) =>
  request('/accounts/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
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

export { BASE_URL };
