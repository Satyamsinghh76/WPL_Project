# Backend Setup & API Reference

Scholar backend is a Django REST API serving as the application's data layer and business logic engine.

## Quick Start

### Local Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create database (SQLite local, PostgreSQL on Render)
python manage.py migrate

# Create debug admin (optional, DEBUG=True only)
python manage.py runserver
# Login: admin / admin

# Populate with dummy users (optional)
python manage.py shell
>>> from accounts.models import PlatformUser
>>> PlatformUser.objects.create_user(...)
```

### Environment Setup

Create `.env` in `backend/` directory:

```env
# Django
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=True

# Database (leave empty for SQLite, set for PostgreSQL)
DATABASE_URL=

# Supabase OAuth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...  # Required for user deletion
```

## Project Structure

```
backend/
├── accounts/              # User auth & management
│   ├── models.py         # PlatformUser, AuthToken
│   ├── views.py          # Login, OAuth, user CRUD, delete
│   ├── urls.py           # Routes
│   ├── auth.py           # Helper functions (JWT validation, roles)
│   └── migrations/       # Database schema versions
├── posts/                # Posts & topics
│   ├── models.py         # Post, Topic
│   ├── views.py          # Feed (with filtering)
│   └── urls.py
├── interactions/         # Votes, comments, reports
│   ├── models.py         # Vote, Comment, Report
│   ├── views.py          # Vote, report endpoints
│   └── urls.py
├── backend/              # Django config
│   ├── settings.py       # App config, caching, database
│   ├── urls.py           # Master routes
│   └── wsgi.py           # WSGI entry (Render)
├── manage.py             # Django CLI
└── requirements.txt      # Python dependencies
```

## Core Models

### PlatformUser
```python
id (pk)
username (str, unique)
email (str, unique)
email_verified (bool)
password_hash (str, optional for OAuth users)
full_name (str)
bio (str)
profile_picture (URL string, from Supabase Storage)
role (ADMIN | DEVELOPER | MODERATOR | VERIFIED | GENERAL)
is_active (bool, True=active, False=banned)
supabase_id (str, UUID from Supabase Auth)
created_at (datetime)
```

**Roles & Permissions:**
- **ADMIN** — Can delete users, ban users, create topics, post, vote, report
- **DEVELOPER** — Can create topics, post, vote, report, switch to other roles
- **MODERATOR** — Can post, vote, report, view moderation dashboard
- **VERIFIED** — Can post, vote, report (upgraded from email verification)
- **GENERAL** — Read-only (can view but not post/vote/report)

**Admin authority note:**
- `PlatformUser.ROLE_ADMIN` controls your application-level moderation and API permissions.
- Django `is_superuser` controls Django admin site (`/admin/`) only and is separate from the app role model.

### Post
```python
id (pk)
author (FK → PlatformUser, CASCADE)
topic (FK → Topic, nullable, SET_NULL)
title (str)
content (text)
references (text, optional URLs or citations)
is_deleted (bool, for soft delete)
created_at (datetime, indexed)
updated_at (datetime)
```

**Indices:**
- `(-created_at, is_deleted)` — Feed ordering
- `(author, -created_at)` — Profile page feed

### Topic
```python
id (pk)
name (str, unique)
parent (FK → Topic self-reference, nullable, SET_NULL)
created_at (datetime)
```

**Usage:** Hierarchical categories (e.g., Computer Science → AI → Machine Learning)

### Vote
```python
id (pk)
user (FK → PlatformUser, CASCADE)
post (FK → Post, CASCADE)
value (1 = upvote, -1 = downvote)
created_at (datetime)
```

**Constraint:** `unique_together = ('user', 'post')` — Each user can only vote once per post (updates via `update_or_create`)

### Comment
```python
id (pk)
author (FK → PlatformUser, CASCADE)
post (FK → Post, CASCADE)
content (text)
is_deleted (bool)
created_at (datetime)
updated_at (datetime)
```

### Report
```python
id (pk)
reporter (FK → PlatformUser, CASCADE)
target_type ('post' | 'user')
post (FK → Post, nullable, CASCADE)
reported_user (FK → PlatformUser, nullable, CASCADE)
reason (text)
status ('pending' | 'resolved' | 'rejected')
created_at (datetime, indexed)
```

### AuthToken
```python
key (str, primary key)
user (FK → PlatformUser, CASCADE)
created_at (datetime)
expires_at (datetime)
```

## API Reference

### Authentication

#### POST /accounts/login/
Local authentication (username/password).
```json
Request:
{
  "username": "alice",
  "password": "secure_password"
}

Response (200):
{
  "token": "abc123def456...",
  "token_expires_at": "2026-04-07T10:00:00Z",
  "id": 1,
  "username": "alice",
  "role": "Verified User",
  "email": "alice@university.edu",
  "email_verified": true,
  "full_name": "Alice Smith",
  "profile_picture": "https://..."
}

Error (401):
{
  "detail": "Invalid credentials."
}
```

#### POST /accounts/oauth/callback/
OAuth callback with Supabase token.
```json
Request:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response (200):
{
  (same user payload as /login/)
}

Error (400):
{
  "detail": "Could not retrieve user info from Supabase."
}
```

#### GET /accounts/me/
Current user profile (requires token header).
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "id": 1,
  "username": "alice",
  "email": "alice@university.edu",
  "role": "Verified User",
  (full user payload)
}

Error (401):
{
  "detail": "Authentication required."
}
```

#### POST /accounts/logout/
Invalidate authentication token.
```
Headers: Authorization: Bearer {token}

Response (200):
{
  "detail": "Logged out successfully."
}
```

#### POST /accounts/forgot-password/
Send a password reset email.
```json
Request:
{
  "email": "alice@university.edu"
}

Response (200):
{
  "detail": "Password reset email sent."
}

Error (404):
{
  "detail": "No account found with this email."
}

Error (503):
{
  "detail": "Password reset email could not be sent."
}
```

The 503 response is intentional and means the backend could not reach the configured mail provider (for example SMTP network unreachable or provider outage).

#### POST /accounts/reset-password/
Reset password using a valid reset token.
```json
Request:
{
  "token": "reset-token",
  "password": "newStrongPassword123"
}

Response (200):
{
  "detail": "Password has been reset successfully."
}
```

### Posts & Feed

#### GET /posts/?sort=new|hot&topic_id=X&page=N
List posts with filtering and pagination.

**Query Parameters:**
- `sort` (optional, default=`new`): `new` (newest first) or `hot` (top score)
- `topic_id` (optional): Filter by topic ID
- `page` (optional, default=1): Page number (20 results/page)
- `viewer_id` (optional): Current user ID (includes `user_vote` field)

```
GET /posts/?sort=new&page=1
GET /posts/?sort=hot&topic_id=3
GET /posts/?sort=new&topic_id=3&viewer_id=1&page=2

Response (200):
{
  "results": [
    {
      "id": 42,
      "title": "How to learn ML?",
      "content": "What are the best resources...",
      "author": "alice",
      "author_id": 1,
      "score": 23,
      "user_vote": 1,
      "topic": "Computer Science",
      "topic_id": 5,
      "created_at": "2026-04-07T08:30:00Z",
      "updated_at": "2026-04-07T08:30:00Z"
    }
  ],
  "count": 127,
  "page": 1,
  "total_pages": 7,
  "sort": "new",
  "topic_id": null
}
```

#### POST /posts/
Create a new post.

```json
Headers: Authorization: Bearer {token}, Content-Type: application/json

Request:
{
  "title": "How to learn ML?",
  "content": "What are the best resources...",
  "references": "https://...",
  "topic_id": 5
}

Response (201):
{
  (post payload, same structure as GET)
}

Error (403):
{
  "detail": "Your role is read-only and cannot create posts.",
  "code": "posting_not_allowed"
}
```

#### GET /posts/{id}/
Get a single post with vote info.

```
GET /posts/42/?viewer_id=1

Response (200):
{
  (post payload)
}

Error (404):
{
  "detail": "Post not found."
}
```

#### PATCH /posts/{id}/
Update post (author or admin only).

```json
Headers: Authorization: Bearer {token}

Request:
{
  "title": "Updated title",
  "content": "Updated content"
}

Response (200):
{
  (updated post payload)
}

Error (403):
{
  "detail": "You do not have permission to edit this post."
}
```

#### DELETE /posts/{id}/
Soft-delete post (author or admin only).

```
Headers: Authorization: Bearer {token}

Response (200):
{
  "detail": "Post deleted."
}
```

### Interactions

#### POST /posts/{id}/vote/
Upvote or downvote a post.

```json
Headers: Authorization: Bearer {token}

Request:
{
  "value": 1
}

Response (200):
{
  "post_id": 42,
  "score": 24,
  "user_vote": 1
}

Error (403):
{
  "detail": "General users cannot vote.",
  "code": "voting_not_allowed"
}
```

#### POST /posts/{id}/report/
Report a post.

```json
Headers: Authorization: Bearer {token}

Request:
{
  "reason": "This post violates..."
}

Response (201):
{
  "id": 100,
  "status": "pending"
}
```

#### POST /users/{id}/report/
Report a user account.

```json
Headers: Authorization: Bearer {token}

Request:
{
  "reason": "Harassment and spam"
}

Response (201):
{
  "id": 101,
  "status": "pending"
}

Error (400):
{
  "detail": "You cannot report your own account."
}
```

#### GET /reports/
List all reports (admin/dev/moderator only).

```
Headers: Authorization: Bearer {token}

Response (200):
{
  "results": [
    {
      "id": 100,
      "reporter": "alice",
      "target_type": "post",
      "post_title": "Bad post",
      "post_author": "bob",
      "reason": "Spam",
      "status": "pending",
      "created_at": "2026-04-07T10:00:00Z"
    }
  ]
}

Error (403):
{
  "detail": "Admin, developer, or moderator access required."
}
```

### Users

#### GET /accounts/users/
List all users with status (admin only).

```
Headers: Authorization: Bearer {token}

Response (200):
{
  "results": [
    {
      "id": 1,
      "username": "alice",
      "email": "alice@university.edu",
      "role": "Verified User",
      "is_active": true,
      "full_name": "Alice Smith",
      "created_at": "2026-04-01T00:00:00Z"
    }
  ]
}
```

#### PATCH /accounts/users/{id}/
Update user profile, role, or status (auth user or admin).

```json
Headers: Authorization: Bearer {token}

Request (edit own):
{
  "full_name": "Alice Smith Jr.",
  "email": "newemail@university.edu",
  "bio": "AI researcher"
}

Request (change role - admin only):
{
  "role": "Moderator"
}

Request (ban user - admin only):
{
  "is_active": false
}

Response (200):
{
  (updated user payload)
}
```

#### DELETE /accounts/users/{id}/
Hard delete user from everywhere (admin only).

Removes user from:
1. Supabase Auth (via Admin API)
2. Local Django database (cascades to posts, comments, votes)
3. OAuth session

```
Headers: Authorization: Bearer {token}

Response (200):
{
  "detail": "User deleted successfully."
}

Error (403):
{
  "detail": "Only admins can delete users."
}

Error (500):
{
  "detail": "Supabase rejected the admin delete request (not_admin). Your backend is not using a valid SUPABASE_SERVICE_ROLE_KEY for this project."
}
```

### Topics

#### GET /topics/
List all topics (public, no auth required).

```
Response (200):
{
  "results": [
    {
      "id": 1,
      "name": "Computer Science",
      "parent_id": null,
      "parent_name": null
    },
    {
      "id": 5,
      "name": "Machine Learning",
      "parent_id": 1,
      "parent_name": "Computer Science"
    }
  ]
}
```

#### POST /topics/
Create topic (admin only).

```json
Headers: Authorization: Bearer {token}

Request:
{
  "name": "New Topic",
  "parent_id": 1
}

Response (201):
{
  (topic payload)
}
```

## Authentication & Authorization

### Client-side Usage

1. Store token in localStorage after login
2. Add to all requests: `Authorization: Bearer {token}`
3. Check token expiry before requests (refresh if needed)

### Role-Based Access

Helper function `get_effective_role(request, actor)` checks:
1. `X-Acting-Role` header (for dev testing)
2. User's base role
3. Returns highest available permission level

## Error Codes

| Status | Detail | Meaning |
|--------|--------|---------|
| 400 | Invalid JSON payload | Malformed request body |
| 401 | Authentication required | Missing or invalid token |
| 403 | Admin access required | Insufficient permissions |
| 404 | Post not found | Resource doesn't exist |
| 500 | Internal server error | Django error or Supabase unreachable |
| 502 | Failed to reach Supabase | Network/timeout issue |

## Debugging

### Check Database State
```bash
python manage.py shell
>>> from accounts.models import PlatformUser
>>> PlatformUser.objects.filter(username='alice').values()
```

### View Logs
```bash
# Render dashboard logs
# Or local: python manage.py runserver (shows all requests)
```

### Test Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/accounts/me/
```

---

**Last Updated:** April 7, 2026
