# **Scholr** — *Anti-Brain-Rot for Research*

> **Designed to reverse algorithmic brain rot.**
> A deliberate, evidence-first space for deep work, serious discourse, and meaningful collaboration.

**Live Demo:** [scholr-beryl.vercel.app](https://scholr-beryl.vercel.app/)
**Backend API:** [wpl-project-6334.onrender.com](https://wpl-project-6334.onrender.com/health/)
**LinkedIn:** [linkedin.com/company/scholr-satyam-gitaansh](https://www.linkedin.com/company/scholr-satyam-gitaansh)

---

## **Who Is Scholr For?**

**PhD candidates** hunting for methods that actually work (no blog-post advice).  
**Researchers** tired of Twitter discourse replacing peer review.  
**Lab teams** collaborating across time zones without siloed knowledge.  
**Early-career scholars** building reputation on what they know, not just who they know.  
**Journal clubs** that need structure beyond Zoom and email threads.

---

## **Why Scholr Exists**

### *The Problem*
- **Research is fragmented:** Knowledge lives in journals (paywalled), Twitter (ephemeral), Discord (unsearchable), lab notebooks (private).
- **No credibility signal:** Can't tell if a claim is "from a Nature paper" or "from a guy on Reddit."
- **Collaboration is friction:** You find brilliant people but have no way to formally work together on open problems.
- **Replication is taboo:** Failed experiments and negative results vanish. Science loses institutional memory.
- **Academic Twitter is a circus:** Volume ≠ validity. Engagement metrics ≠ scientific truth.

### *Scholr's Answer*
Evidence-first discourse. Collaboration infrastructure. Verifiable claims. Reputation you build through outcomes.

---

## **Mission**

**Protect attention, restore depth, and make the scholarly record trustworthy.**

We're building an alternative to dopamine-driven feeds: a place where every claim is traceable, every contributor is credited, and thoughtful work is rewarded over endless scrolling.

---

## **Catchy Phrases**

- *"Claim it. Back it. Defend it."* — Move faster through evidence.  
- *"Research reputation ≠ follower count."* — Show what you've solved.  
- *"Open problems need open teams."* — Find your collaborators, not your audience.  
- *"Replications matter. We count them."* — Make negative results part of the record.  
- *"From ephemeral to permanent."* — Discourse that matters beyond the algorithm.
- *"Trust, but verify."* — Built on evidence grades, not just upvotes.
- *"Depth over dopamine."* — Built for attention, not addiction.
- *"Stop scrolling. Start thinking."* — A feed designed for focus.

---

## **Anti-Brain-Rot Principles**

- **Depth over virality:** Strong arguments and evidence outlast hot takes.
- **Signal over noise:** Claim quality matters more than engagement tricks.
- **Attention as a public good:** The product should improve focus, not fragment it.
- **Slow thinking by design:** Structured claims, references, and context over reactive posting.
- **Compounding knowledge:** Discussions remain searchable, citable, and useful months later.

---

## **Tech Stack**

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| Backend | Django 4.2, Django REST Framework |
| Authentication | Custom token auth + Supabase OAuth (Google, LinkedIn) |
| Database | PostgreSQL (production), SQLite (local dev) |
| Deployment | Vercel (frontend), Render (backend), Supabase (auth + storage) |

---

## **Core Features**

### **Claim-Based Discourse**
- Posts structured around verifiable **claims**, not just opinions
- Each claim gets a **confidence score** based on community review
- **Evidence quality labels** (peer-reviewed, preprint, data, anecdotal)
- Contradiction linking: mark conflicting claims side-by-side

### **Research Collaboration**
- **Open Problem posts** with skill needs, data requirements, and bounty tracking
- Collaborator matching based on profile expertise and topic history
- Team formation and progress tracking within topics
- Credit attribution: all co-authors visible, not buried

### **Trustworthy Moderation**
- **Role-based access control** (5 tiers: General → Verified → Moderator → Developer → Admin)
- Evidence-grading by trained reviewers (not just upvote/downvote)
- Replication and negative-result tracking
- Multi-reviewer conflict resolution for high-stakes claims

### **Knowledge Organization**
- Hierarchical topics and subtopics (e.g., ML → Deep Learning → Transformers)
- **Topic-level reliability scores** updated as claims age
- Full-text search across papers, discussions, open problems
- Citation tracking and dependency mapping

### **Community Safety**
- Verified-email gating for contribution (signup anyone, speak after verification)
- Post reporting with transparency into moderation decisions
- User reputation tied to calibration (do your assessments age well?)
- Admin tools for content curation and account management

### **Discovery & Retention**
- Dark/light mode with responsive mobile design
- Real-time search: posts, users, topics, claims
- Related discussions sidebar (similar claims, open problems, replications)
- Message researchers directly for collaboration opportunity

---

## 👥 **Role-Based Access**

| Feature | General | Verified | Moderator | Developer | Admin |
|---------|:---:|:---:|:---:|:---:|:---:|
| **View posts** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create posts** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Vote on claims** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Grade evidence** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Start collaboration** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Report content** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Manage topics** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ban users** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **System config** | ❌ | ❌ | ❌ | ✅ | ✅ |

**What triggers "Verified User"?**
- Verify your institutional email (optional: connect profile to ORCID)
- Automatically upgraded from "General User" on email confirmation

**What triggers "Moderator"?**
- Admin invitation based on track record (fair assessments, constructive feedback)
- Must maintain calibration score (accuracy of evidence grades over time)

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

## 📋 **Data Model**

### **Claim (not just "Post")**
- **Title & claim statement** (what are you asserting?)
- **Evidence section** with quality grades (peer-reviewed, preprint, data, anecdotal, opinion)
- **References & citations** (links to papers, datasets, code repositories)
- **Confidence score** (weighted community votes on claim validity)
- **Open problems linked** (what question does this solve?)

### **Open Problem**
- Needed skills & time estimate
- Data availability & requirements
- Bounty/credit structure
- Status: Open → In Progress → Solved
- Team members & attribution

### **Replication**
- Links to original claim
- Protocol used & deviations noted
- Results & confidence
- Timestamp (when was this tested?)

### **Collaborations & Teams**
- Lead author + contributors
- Contributors tagged by role (methods, data, analysis, writing)
- Progress milestones
- Public portfolio of what you shipped

### **Community Review**
- Per-claim vote with **evidence grade** (not just +/-)
- Moderator notes on contested claims
- Correction log (when consensus shifts)
- Calibration score for reviewers

---

## 🔌 **Key API Endpoints**

### **Claim Management**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/posts/?sort=new\|hot` | Claim feed (sorted by confidence or timestamp) |
| POST | `/api/posts/` | Make a claim with evidence tags |
| POST | `/api/posts/:id/vote/?grade=peer-reviewed\|preprint\|data\|...` | Vote on claim with evidence quality |
| GET | `/api/posts/:id/related/` | Related claims in same topic |

### **Collaboration**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/open-problems/` | Post an open problem (coming soon) |
| POST | `/api/collaborations/` | Start a team (coming soon) |
| POST | `/api/replications/` | Log a replication attempt (coming soon) |

### **Topics & Discovery**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/topics/?sort=reliability_score` | Topics ranked by health (coming soon) |
| GET | `/api/search/?q=query` | Search across claims, people, problems |
| GET | `/api/posts/:id/contradictions/` | Conflicting claims (coming soon) |

### **Auth & Roles**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/accounts/login/` | Login with email or OAuth |
| GET | `/api/accounts/me/` | Your profile + calibration score |
| POST | `/api/accounts/verify-email/` | Upgrade from General → Verified |

---

## 📦 **Project Structure**

```
WPL_Project/
├── backend/
│   ├── accounts/           # User auth, roles, reputation
│   │   ├── models.py      # PlatformUser, AuthToken, Reputation
│   │   ├── views.py       # Login, signup, OAuth
│   │   ├── auth.py        # Token validation, role checks
│   ├── posts/             # Claims & evidence
│   │   ├── models.py      # Post, Topic, EvidenceTag
│   │   ├── views.py       # Claim CRUD, search, filtering
│   ├── interactions/      # Votes, reports, collaboration
│   │   ├── models.py      # Vote, Report, Comment, Conversation
│   │   ├── views.py       # Voting logic, moderation
│   ├── backend/           # Django config, settings
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Claim feed with evidence grades
│   │   │   ├── PostDetail.jsx     # Claim detail + contradictions
│   │   │   ├── PublicProfile.jsx  # Researcher profile + rep score
│   │   │   ├── ModerationReports.jsx # Moderation dashboard
│   │   │   ├── Messages.jsx       # Collaboration messaging
│   │   ├── components/
│   │   │   ├── ChatWidget.jsx     # Real-time messaging
│   │   │   ├── MarkdownContent.jsx
│   │   │   └── PostMediaCarousel.jsx
│   │   ├── api.js                 # API client
│   │   └── App.jsx                # Router & session
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   ├── DATABASE.md
│   ├── FILTERING_API.md
│   └── OPTIMIZATION.md
```

---

## 🚢 **Deployment**

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend (React) | **Vercel** | Auto-deploy on `main` push |
| Backend (Django) | **Render** | Auto-deploy, includes migrations |
| Database (PostgreSQL) | **Supabase** | +OAuth, file storage for media |
| Identity | **Supabase Auth** | Supports Google, LinkedIn, email |

---

## 🎓 **Key Principles**

1. **Evidence > Engagement** — A claim from a peer-reviewed paper beats a trending hot take.
2. **Transparency in Moderation** — When a claim is flagged, the community sees *why* and *who decided*.
3. **Credentials that Compound** — Earn reputation token by token, through contributions, not just followers.
4. **Collaboration as First-Class** — Open problems, teams, co-authorships baked into the core, not bolt-on.
5. **Replications Matter** — Failed experiments get storage and credit, not buried forever.

---

## 👨‍💻 **Build This Locally**

### **Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
pip install -r requirements.txt
cp .env.example .env      # Edit with your secrets
python manage.py migrate
python manage.py runserver
```
👉 Backend runs on `http://localhost:8000`

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```
👉 Frontend runs on `http://localhost:5173`

---

## 📚 **Documentation**

- [Architecture Overview](docs/ARCHITECTURE.md) — System design, data flow
- [Backend API](docs/BACKEND.md) — Models, endpoints, authentication
- [Database Schema](docs/DATABASE.md) — Full ERD, indices, constraints
- [Filtering & Sorting](docs/FILTERING_API.md) — Query optimization
- [Performance Tuning](docs/OPTIMIZATION.md) — Backend & frontend optimizations

---

## 🤝 **Team**

**Gitaansh** — Backend architecture, API design  
**Satyam** — Frontend, UX/UI

---

## 📄 **License**

Scholr is in active development. Licensing details coming soon.

---

## 🚀 **What's Next?**

**Phase 1 (MVP stability)**
- [ ] Claim-level confidence scoring
- [ ] Evidence quality grades
- [ ] User reputation / calibration tracking

**Phase 2 (Collaboration)**
- [ ] Open Problem marketplace
- [ ] Team formation & messaging
- [ ] Co-author credit system

**Phase 3 (Research Infrastructure)**
- [ ] Replication tracking
- [ ] Topic-wide consensus monitoring
- [ ] API for scientific consumers

---

## 💬 **Get Involved**

Have ideas? Found a bug? Want to collaborate?  
→ Open an issue or reach out on [LinkedIn](https://www.linkedin.com/company/scholr-satyam-gitaansh)


---

## License

This project is in active development. License TBD.
