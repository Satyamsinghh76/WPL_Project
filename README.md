# AcademiaHub

An academic social platform combining Reddit's topic-based discussions, LinkedIn's professional profiles, and peer-regulated content quality.

## Quick Start

### Test Login Credentials

| Username | Password | Role           |
|----------|----------|----------------|
| `admin`  | `admin`  | Administrator  |
| `mod`    | `mod`    | Moderator      |
| `dev`    | `dev`    | Developer      |
| `userV`  | `userV`  | Verified User  |
| `user`   | `user`   | General User   |

### Development Setup

**Frontend (Terminal 1):**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Backend (Terminal 2):**
```bash
python -m venv venv
venv\Scripts\activate  # Windows | source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt

cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
# Runs on http://localhost:8000
```

### PostgreSQL Setup

1. Install PostgreSQL: https://www.postgresql.org/download/
2. Create database:
```bash
psql -U postgres
CREATE DATABASE academiahub;
\q
```
3. Run migrations to create tables and seed data:
```bash
cd backend
psql -U postgres -d academiahub -f migrations/001_create_tables.sql
psql -U postgres -d academiahub -f migrations/002_seed_data.sql
```
4. Update `settings.py`:
```env
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'academiahub',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

**Test Users** (password: `password123`):
- admin@academiahub.com (Administrator)
- mod@academiahub.com (Moderator)  
- verified@academiahub.com (Verified User)

---

## Core Features

**User Management:**
* Role-based access control (5 roles)
* JWT authentication
* User profiles with institution and interests

**Content System:**
* Topics and subtopics (hierarchical)
* Academic posts with markdown and references
* Voting system

**Moderation:**
* User reporting
* Admin tools (delete, warn, ban)
* Content quality control

**Feed:**
* Sorting (Hot/New)
* Minimal, academic-focused UI

---

## Technology Stack

**Frontend:**
* React 18 + Vite
* React Router
* CSS3 (custom styling)

**Backend:**
* Django
* PostgreSQL

**Development:**
* Git version control
* Hot reload for both frontend and backend

---
## 🗄 Database Schema (PostgreSQL)

**Tables:**

```sql
-- users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  university VARCHAR(255),
  pronouns VARCHAR(50),
  bio TEXT,
  role VARCHAR(50) DEFAULT 'General User',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- posts
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  references TEXT[],
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- topics (planned)
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES topics(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- votes (planned)
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  post_id INTEGER REFERENCES posts(id),
  value INTEGER CHECK (value IN (-1, 1)),
  UNIQUE(user_id, post_id)
);

-- reports (planned)
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  reporter_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Backend Structure

The backend follows a clean, modular architecture:

```
backend/
├── manage.py
├── backend/
│   ├── settings.py
│   └── urls.py
├── apps/
│   ├── accounts/
│   ├── posts/
│   ├── interactions/
│   └── core/
├── migrations/              # SQL migration scripts
│   ├── 001_create_tables.sql
│   ├── 002_seed_data.sql
│   └── README.md
├── apis/
│   └── v1/
│       ├── urls.py
│       ├── posts.py
│       └── users.py
├── services/
│   └── post_service.py/
├── requirements.txt
└── README.md
```

**Architecture layers:**
- **Models**: Django ORM (database)
- **Services**: Business logic and data operations
- **API**: Django views (JSON responses)
- **Core**: Configuration and shared utilities

Flow :
```
API → Services → Models
```

---

## API Endpoints

**Current:**
* GET `/api/v1/posts` - Get all posts
* GET `/api/v1/posts/{id}` - Get specific post
* POST `/api/v1/posts` - Create post
* PUT `/api/v1/posts/{id}` - Update post
* DELETE `/api/v1/posts/{id}` - Delete post
* GET `/health` - Health check

**Planned:**
* POST `/api/v1/auth/login` - User login
* POST `/api/v1/auth/signup` - User registration
* GET `/api/v1/users/{id}` - Get user profile
* POST `/api/v1/votes` - Vote on post
* POST `/api/v1/reports` - Report post
* GET `/api/v1/topics` - Get all topics

---

## Development Notes

**Frontend runs separately during development:**
* Frontend: `http://localhost:5173` (Vite dev server)
* Backend exposes REST APIs
* Communication via fetch / HTTP
* CORS enabled for cross-origin requests

**Database:**
* PostgreSQL for production
* SQLite for quick local development
* Django ORM handles migrations

**Architecture:**
* Layered structure: API → Services → Models
* Dependency injection for database sessions
* Versioned API routes (/api/v1/)
* Centralized configuration management

**Testing:**
* Interactive API docs at `/docs`
* Health check endpoint at `/health`
* Pre-seeded test data for development

---

## Team

**Backend:** Gitaansh  
**Frontend:** Satyam

---

## Current Status

**In Progress:**
- Backend API development
- PostgreSQL database integration
- Authentication endpoints
- Full CRUD operations

**Planned:**
- Real-time voting system
- User profiles and settings
- Advanced moderation tools
- Feed sorting algorithms
- Image and video support

---

## Key Features by Role

| Feature | General User | Verified User | Moderator | Developer | Administrator |
|---------|--------------|---------------|-----------|-----------|---------------|
| View posts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create posts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Vote on posts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Report posts | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete posts | ❌ | Own only | Any | Any | Any |
| Warn users | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage topics | ❌ | ❌ | ❌ | ✅ | ✅ |
| System config | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Resources

* [PostgreSQL Documentation](https://www.postgresql.org/docs/)
* [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
* [React Documentation](https://react.dev/)
* [Vite Documentation](https://vitejs.dev/)

---

## Deployment Strategy 

```
React App (Vercel) / Netlify (no react)
        ↓ API calls
Django API (Render/Railway)
        ↓
PostgreSQL
        ↓
Cloudinary / Supabase
```

---

## License

This project is in development. License TBD.