# **Scholr** — Development & Architecture Guide

> **Evidence-first discourse platform for scholars**  
> Built with Django (backend), React/Vite (frontend), and Supabase (auth + storage).

This guide covers system design, API architecture, and optimization for contributors & maintainers.

Product mission context: Scholr is intentionally anti-brain-rot. The product should improve user attention quality over time, not degrade it.

---

## 📖 **Documentation Index**

- **[Architecture](./ARCHITECTURE.md)** — System design, microservices, data flow, deployment
- **[Backend API](./BACKEND.md)** — REST endpoints, models, authentication flow
- **[Frontend](./FRONTEND.md)** — Component hierarchy, state management, styling approach
- **[Database Schema](./DATABASE.md)** — Full ERD, indices, constraints, migrations
- **[Filtering & Sorting](./FILTERING_API.md)** — Query optimization, pagination, search
- **[Performance Guide](./OPTIMIZATION.md)** — Backend caching, frontend code-splitting, infrastructure tuning

---

## 🏗️ **System Overview**

```
Client (React)                    Server (Django)                Database (PostgreSQL)
├─ Home (claim feed)              ├─ POST /api/posts/            ├─ PlatformUser
├─ Claim Detail                   ├─ GET /api/posts/             ├─ Post
├─ Researcher Profile             ├─ POST /api/posts/:id/vote/   ├─ Vote
├─ Open Problems (WIP)            ├─ GET /api/topics/            ├─ Topic
├─ Team Collaboration (WIP)       ├─ POST /api/collaborations/   ├─ Comment
├─ Messages                       ├─ GET /api/conversations/     ├─ Conversation
└─ Admin Panel                    └─ Auth flow (OAuth + local)    └─ Report

       ↓ REST API (JWT auth)            ↓ ORM (Django)
                                         ↓ Indices for performance
```

---

## 🎯 **Core Data Models**

### **Claim (= Post)**
The fundamental unit. What you're asserting about a topic.
- **Title** + **Content** (claim statement)
- **Topic** (hierarchical category)
- **Author** (who said it) + **Created at** (when)
- **References** (links to papers, datasets, code)
- **Media items** (images, videos, supplementary)
- **Confidence score** (aggregate of votes)
- **Status**: live, contested, resolved, retracted

### **Vote** (= Confidence Signal)**
- **Value**: +1 (agree), -1 (disagree)
- **Reviewer role**: Verified User, Moderator, etc.
- **Evidence grade** *(coming soon)*: peer-reviewed, preprint, data, anecdotal, opinion
- **Timestamp**: when was this assessed

### **Topic** (= Knowledge Domain)
Hierarchical organization of claims.
- **Name**: unique topic slug
- **Parent**: optional parent topic (e.g., ML → Deep Learning)
- **Subtopics**: children
- Reliability score *(coming soon)*: computed from consensus on claims in topic

### **Conversation & Message** (= Collaboration Infrastructure)
Direct messaging + topic rooms for research teams.
- **Type**: direct (1:1), group (many users), topic-room (all interested in topic)
- **Members**: list of participants
- **Messages**: content, sender, timestamp

### **Report & Moderation**
- **Target**: post or user
- **Reason**: violation category + description
- **Status**: pending, resolved, rejected
- **Resolution**: moderator decision + notes

---

## 🔐 **Authentication & Authorization**

### **User Roles** (5 tiers)
1. **General User** — Can view, cannot post/vote
2. **Verified User** — Email verified, can post/vote/comment
3. **Moderator** — Can grade evidence, handle reports, manage content
4. **Developer** — Can manage topics, system config, topic rooms
5. **Admin** — Full access: user management, role assignment, system settings

### **Auth Flow**
```
User Input (email + password or OAuth)
    ↓
/api/accounts/login/ or /api/accounts/oauth/callback/
    ↓
Backend validates & issues AuthToken (expires 24h)
    ↓
Frontend stores token in localStorage + Authorization header
    ↓
All subsequent requests include Bearer token
    ↓
Backend validates token signature & expiry
```

---

## 🚀 **Project Structure**

```
WPL_Project/
├── backend/
│   ├── accounts/
│   │   ├── models.py          # PlatformUser, AuthToken, EmailToken
│   │   ├── views.py           # Login, signup, OAuth, profile CRUD
│   │   ├── auth.py            # Token validation, role helpers
│   │   ├── emails.py          # Verification & password reset emails
│   │   ├── urls.py
│   │   └── migrations/        # Database schema changes
│   │
│   ├── posts/
│   │   ├── models.py          # Post, Topic
│   │   ├── views.py           # Feed, CRUD, search, filtering
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── interactions/
│   │   ├── models.py          # Vote, Comment, CommentVote, Report, Conversation, Message
│   │   ├── views.py           # Voting, commenting, messaging, moderation
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── backend/
│   │   ├── settings.py        # Django config, DATABASES, CACHES, CORS
│   │   ├── urls.py            # Root URL router
│   │   ├── middleware.py      # API exception logging
│   │   ├── wsgi.py            # WSGI app for Render
│   │   └── asgi.py
│   │
│   ├── manage.py              # Django CLI
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example
│   └── build.sh               # Deployment script
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Claim feed, filtering, new claim form
│   │   │   ├── PostDetail.jsx         # Claim detail, comments, voting
│   │   │   ├── PublicProfile.jsx      # Researcher profile + rep score
│   │   │   ├── ModerationReports.jsx  # Moderation dashboard
│   │   │   ├── Messages.jsx           # Messaging page
│   │   │   ├── AdminUsers.jsx         # User management
│   │   │   ├── Login.jsx, Signup.jsx, AuthCallback.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── SearchResults.jsx
│   │   │
│   │   ├── components/
│   │   │   ├── ChatWidget.jsx         # Real-time message
│   │   │   ├── MarkdownContent.jsx    # Render markdown
│   │   │   └── PostMediaCarousel.jsx  # Image/video carousel
│   │   │
│   │   ├── hooks/
│   │   │   └── useInfiniteScroll.js   # Infinite scroll observer
│   │   │
│   │   ├── api.js                     # Centralized API client (fetch wrapper)
│   │   ├── supabase.js                # Supabase client config
│   │   ├── App.jsx                    # Main router, session mgmt
│   │   ├── main.jsx                   # React Query provider, entry point
│   │   └── index.css                  # Tailwind + custom utilities
│   │
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vercel.json
│   ├── package.json
│   ├── .env.example
│   └── index.html
│
├── docs/
│   ├── README.md (you are here)
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── DATABASE.md
│   ├── FILTERING_API.md
│   └── OPTIMIZATION.md
│
└── .gitignore
```

---

## 💡 **Design Principles**

| Principle | Rationale |
|-----------|-----------|
| **Evidence > Popularity** | A claim from Nature beats a trending opinion |
| **Transparency** | All moderation decisions visible + reversible |
| **Credentials Compound** | Reputation tied to accuracy over time, not followers |
| **Collaboration First** | Teams, open problems, co-authorship as core features |
| **Replications Visible** | Failed experiments preserved and credited |
| **Depth > Dopamine** | UI and ranking should reward thoughtful reading over compulsive scrolling |

---

## 🔧 **Getting Started**

### **Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
cp .env.example .env      # Fill in API keys
python manage.py migrate
python manage.py runserver
```

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

### **Tests**
```bash
# Backend (Django)
cd backend
python manage.py test

# Frontend (Vite + Jest) — coming soon
cd frontend
npm test
```

---

## 📊 **Performance Targets**

| Metric | Target | Status |
|--------|--------|--------|
| Feed load (100 posts) | <200ms | ✅ Achieved via indices + pagination |
| Search latency | <100ms | ✅ Full-text index on posts |
| Cold start (Render) | 0s | ✅ Keep-alive ping (10min) |
| Mobile Time to Interactive | <3s | 🔄 Code-splitting + lazy loading |

---

## 🚢 **Deployment**

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Production** | Vercel | Render | Supabase (PostgreSQL) |
| **Development** | `npm run dev` | `python manage.py runserver` | SQLite or local Postgres |

**Steps to deploy:**
1. Push to `main` branch
2. Vercel auto-builds frontend
3. Render auto-deploys backend (runs migrations)
4. Supabase auto-syncs schema

---

## 📚 **Next Steps**

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [BACKEND.md](./BACKEND.md) for API reference
- See [OPTIMIZATION.md](./OPTIMIZATION.md) for performance tuning
- Contribute! Issues and PRs welcome.

---

## ❓ **FAQ**

**Q: Why Django over FastAPI?**  
A: Django ORM maturity, built-in admin, migration system. FastAPI is faster for APIs but Django is safer for long-term maintenance at this scale.

**Q: Why not GraphQL?**  
A: REST is simpler for team of 2, fewer moving parts. GraphQL later if needed.

**Q: How do you handle offline collaboration?**  
A: Currently browser localStorage for drafts. CRDT sync is Phase 3.

---

**Last updated:** April 8, 2026  
**Maintainers:** Gitaansh (backend), Satyam (frontend)

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
