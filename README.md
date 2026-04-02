# Scholr

An academic social platform combining Reddit's topic-based discussions, LinkedIn's professional profiles, and peer-regulated content quality. Built for scholars to share knowledge, connect, and maintain academic rigor.

**Live Demo:** [scholr-beryl.vercel.app](https://scholr-beryl.vercel.app/)
**Backend API:** [wpl-project-6334.onrender.com](https://wpl-project-6334.onrender.com/health/)
**LinkedIn:** [linkedin.com/company/scholr-satyam-gitaansh](https://www.linkedin.com/company/scholr-satyam-gitaansh)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| Backend | Django 4.2, Django REST Framework |
| Authentication | Custom token auth + Supabase OAuth (Google, LinkedIn) |
| Database | PostgreSQL (production), SQLite (local dev) |
| Deployment | Vercel (frontend), Render (backend), Supabase (auth + storage) |

---

## Features

**Authentication & Authorization**
- Role-based access control with 5 user roles
- Custom bearer token authentication with 24-hour expiry
- OAuth login via Google and LinkedIn (Supabase Auth)
- Role switching for Administrators and Developers

**Content System**
- Hierarchical topics and subtopics
- Academic posts with references
- Upvote/downvote system
- Comment threads on posts

**Moderation**
- Post reporting system
- Admin tools for content management (delete, warn, ban)
- Role-based permissions for moderation actions

**User Experience**
- Dark/light theme toggle
- Responsive design with mobile sidebar
- Real-time search across posts, topics, and authors
- User profiles with institution and bio

---

## Role-Based Permissions

| Feature | General User | Verified User | Moderator | Developer | Administrator |
|---------|:---:|:---:|:---:|:---:|:---:|
| View posts | Yes | Yes | Yes | Yes | Yes |
| Create posts | - | Yes | Yes | Yes | Yes |
| Vote on posts | - | Yes | Yes | Yes | Yes |
| Report posts | - | Yes | Yes | Yes | Yes |
| Delete posts | - | Own only | Any | Any | Any |
| Warn/Ban users | - | - | Yes | Yes | Yes |
| Manage topics | - | - | - | Yes | Yes |
| System config | - | - | - | Yes | Yes |
| Switch roles | - | - | - | 2 roles | All roles |

---

## Quick Start

### Test Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Administrator |
| _Removed_ | _Removed_ | Demo logins now only exist for the admin account |

### Local Development

**1. Clone the repository**
```bash
git clone https://github.com/Gitaanshhh/WPL_Project.git
cd WPL_Project
```

**2. Backend setup**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp .env.example .env         # Edit .env with your credentials
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
# Runs on http://localhost:8000
```

**3. Frontend setup**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Environment Variables

**Backend (`backend/.env`):**
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

**Frontend (`frontend/.env.development`):**
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If you are developing locally without OAuth, you can leave the Supabase variables unset. Username/password login will still work; Google and LinkedIn login require the Supabase variables.

---

## OAuth Setup (Google & LinkedIn)

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Google** and **LinkedIn (OIDC)** providers under Authentication > Providers
3. Configure OAuth credentials from [Google Cloud Console](https://console.cloud.google.com) and [LinkedIn Developers](https://www.linkedin.com/developers/apps)
4. Set the Supabase callback URL as the redirect URI in both providers:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   ```
5. In Supabase Authentication > URL Configuration:
   - Site URL: `https://scholr-beryl.vercel.app`
   - Redirect URLs: `https://scholr-beryl.vercel.app/auth/callback`, `http://localhost:5173/auth/callback`

6. After Google or LinkedIn login, users are prompted to set a local password before the account is activated as a Verified User.

7. Frontend deploys on Vercel and backend deploys on Render; Supabase is only used for OAuth identity and storage.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/login/` | Login with username/password |
| POST | `/api/accounts/logout/` | Revoke auth token |
| POST | `/api/accounts/oauth/callback/` | Exchange Supabase token and complete the local password step |
| GET | `/api/accounts/me/` | Get current authenticated user |
| GET | `/api/accounts/roles/` | List available roles |
| GET | `/api/accounts/switchable-roles/` | Get roles current user can switch to |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/users/` | List all users for admin management |
| POST | `/api/accounts/users/` | Create new user (signup) |
| GET | `/api/accounts/users/:id/` | Get user profile |
| PATCH | `/api/accounts/users/:id/` | Update user profile or change role as admin |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/` | List all posts |
| POST | `/api/posts/` | Create a post |
| GET | `/api/posts/:id/` | Get post details |
| DELETE | `/api/posts/:id/` | Delete a post |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics/` | List all topics |
| POST | `/api/topics/` | Create a topic |

### Interactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/:id/vote/` | Vote on a post |
| POST | `/api/posts/:id/report/` | Report a post |
| GET | `/api/posts/:id/comments/` | List comments on a post |
| POST | `/api/posts/:id/comments/` | Add a comment |
| DELETE | `/api/comments/:id/` | Delete a comment |
| GET | `/api/reports/` | List all reports |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/` | Server health check |

---

## Project Structure

```
WPL_Project/
├── backend/
│   ├── accounts/          # User auth, OAuth, roles
│   │   ├── models.py      # PlatformUser, AuthToken
│   │   ├── views.py       # Login, signup, OAuth, /me
│   │   ├── auth.py        # Token validation, role switching
│   │   └── urls.py
│   ├── posts/             # Topics and posts CRUD
│   ├── interactions/      # Votes, comments, reports
│   ├── backend/           # Django settings, root URLs
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app, routing, session mgmt
│   │   ├── api.js         # Centralized API client
│   │   ├── supabase.js    # Supabase client for OAuth
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── Login.jsx
│   │       ├── Signup.jsx
│   │       ├── AuthCallback.jsx
│   │       ├── PostDetail.jsx
│   │       ├── Profile.jsx
│   │       └── Settings.jsx
│   ├── .env.example
│   ├── .env.development
│   ├── .env.production
│   ├── package.json
│   └── vite.config.js
└── .gitignore
```

---

## Deployment

```
Vercel (React frontend)
    ↓ API calls
Render (Django backend)
    ↓
Supabase (PostgreSQL + OAuth)
```

**Vercel** auto-deploys on push to `main`. Root directory set to `frontend`.

**Render** auto-deploys on push to `main`. Environment variables configured in dashboard.

**Supabase** handles OAuth providers and can serve as the production database.

---

## Team

| Name | Role |
|------|------|
| **Gitaansh** | Backend |
| **Satyam** | Frontend |

---

## License

This project is in active development. License TBD.
