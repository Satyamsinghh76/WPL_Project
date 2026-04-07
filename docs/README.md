# Scholar - Academic Discussion Platform

Scholar is a web platform for academic discussions, professional networking, and collaborative knowledge-sharing. Built with Django (backend), React/Vite (frontend), and Supabase (authentication).

## Quick Links

- **[Architecture](./ARCHITECTURE.md)** — System design, tech stack, data flow
- **[Backend Setup & API](./BACKEND.md)** — REST endpoints, database, authentication
- **[Frontend Guide](./FRONTEND.md)** — Component structure, state management, styling
- **[Database Schema](./DATABASE.md)** — Data models, relationships, indices
- **[Optimization](./OPTIMIZATION.md)** — Build/runtime tuning and performance notes

## Project Structure

```
WPL/
├── backend/                    # Django REST API
│   ├── accounts/              # Authentication & user management
│   ├── posts/                 # Posts, topics, feed logic
│   ├── interactions/          # Votes, comments, reports
│   ├── backend/               # Django settings & URLs
│   └── manage.py              # Django CLI
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/             # Route components
│   │   ├── components/        # Reusable components
│   │   ├── api.js             # API client
│   │   └── main.jsx           # Entry point
│   └── index.html
├── docs/                       # This documentation
└── venv/                       # Python virtual environment
```

## Core Features

### User Management
- OAuth authentication (Supabase)
- Local auth (username/password for dev)
- Role-based access: Admin, Developer, Moderator, Verified User, General User
- Email verification
- Profile management with avatar uploads

### Academic Content
- Posts with topics (hierarchical)
- Comments on posts
- Voting (upvote/downvote)
- Post deletion (soft delete)

### Moderation & Safety
- Report system (posts + users)
- Moderation dashboard for reports
- User banning (soft delete via is_active=False)
- Hard deletion (removes from everywhere)

### Performance
- Database indices for fast queries
- Pagination (20 posts/page)
- Backend filtering & sorting
- React Query for client-side caching
- CDN caching for frontend assets (1 year)

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Interactive UI, instant module loading |
| **Backend** | Django 4 + DRF | REST API, ORM, authentication |
| **Database** | PostgreSQL (Render) / SQLite (local) | Persistent data storage |
| **Auth** | Supabase Auth | OAuth + JWT + Admin API for user deletion |
| **Storage** | Supabase Storage | Profile pictures in cloud bucket |
| **Deployment** | Render (free tier) | Backend hosting |
| **Frontend Host** | Vercel | SPA hosting with caching headers |
| **Styling** | Tailwind CSS | Utility-first CSS framework |

## Key Endpoints

### Authentication
- `POST /accounts/login/` — Username/password login
- `POST /accounts/oauth/callback/` — OAuth with Supabase token
- `GET /accounts/me/` — Current user profile
- `POST /accounts/logout/` — Invalidate token
- `POST /accounts/forgot-password/` — Request reset email (returns 404 for missing user, 503 for delivery failure)
- `POST /accounts/reset-password/` — Reset password with token

### Posts & Feed
- `GET /posts/?sort=new|hot&topic_id=X&page=N` — Filtered feed (uses indices)
- `POST /posts/` — Create new post
- `GET /posts/{id}/` — Post details
- `PATCH /posts/{id}/` — Edit post
- `DELETE /posts/{id}/` — Soft delete post

### Interactions
- `POST /posts/{id}/vote/` — Vote on post
- `POST /posts/{id}/report/` — Report post
- `POST /users/{id}/report/` — Report user
- `GET /reports/` — Moderation dashboard

### Users
- `GET /accounts/users/` — List all users (admin only)
- `PATCH /accounts/users/{id}/` — Update user profile/role/status
- `DELETE /accounts/users/{id}/` — Hard delete user (admin only)

See [Backend Setup & API](./BACKEND.md) for full details.

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-django-secret
DEBUG=True|False
DATABASE_URL=postgres://user:pass@host:port/db  (Render production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=super-secret-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (Required for user deletion)
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000  (dev) or https://backend.onrender.com  (prod)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PROFILE_BUCKET=profile-pictures
```

## Getting Started

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

### Production Deployment

1. **Database**: Create PostgreSQL on Render
2. **Backend**: Deploy to Render on free tier
3. **Frontend**: Deploy to Vercel
4. **Keep-Alive**: Set up cron job (cron-job.org) to ping backend every 10 minutes
5. **Supabase**: Set service role key in backend env

See [Deployment & Optimization](./DEPLOYMENT.md) for detailed steps.

## Performance Metrics

- **Cold start elimination**: Cron-based keep-alive (0s vs 30–60s)
- **Feed load time**: 50ms (with indices + pagination + caching)
- **Asset caching**: 1-year immutable hashes
- **API deduplication**: React Query (2-minute stale time)

## Common Tasks

### Add a New API Endpoint
1. Create model in `models.py`
2. Create view in `views.py` with `@csrf_exempt` decorator
3. Add route in `urls.py`
4. Add API helper in `frontend/src/api.js`

### Add a New Page/Component
1. Create React component in `src/pages/` or `src/components/`
2. Add route in `App.jsx`
3. Fetch data via API helpers

### Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Create Superuser (for Django admin)
```bash
python manage.py createsuperuser
```

Use this only if you need Django Admin site access (`/admin/`). It is separate from your app's `PlatformUser` role system.

## Admin Strategy

### PlatformUser Administrator (recommended as primary)
- Governs in-app permissions and moderation flows used by your frontend.
- Follows your existing role-switch and token auth model.
- Safer for day-to-day operations because access is scoped to app endpoints.

### Django Superuser (optional, operational)
- Full unrestricted access to Django admin and database-backed models.
- Useful for emergency fixes, data inspection, and migration-era operations.
- Higher risk if used as daily admin path because it bypasses app-level role rules.

Recommended setup: keep `PlatformUser` Administrator as the normal control plane, and keep one Django superuser only for break-glass maintenance.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend 403 on delete | Service role key missing/wrong. Set `SUPABASE_SERVICE_ROLE_KEY` env var |
| Feed loads slow | Verify indices exist: `SELECT * FROM django_migrations WHERE app='posts'` |
| OAuth not working | Check Supabase URL + anon key match between backend + frontend |
| Forgot-password returns 503 | Mail provider/network is unreachable from host. API now correctly reports delivery failure; verify SMTP/API provider connectivity and credentials |
| Cold start delays | Activate cron keep-alive at cron-job.org |

## Support & Contributing

See [Backend Setup & API](./BACKEND.md), [Frontend Guide](./FRONTEND.md), and [Architecture](./ARCHITECTURE.md) for implementation details.

---

**Last Updated:** April 7, 2026
