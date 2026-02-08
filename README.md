# HabitTracker

HabitTracker is a full-stack habit and productivity tracking application.
The project starts with a small frontend-only prototype (for UI/UX validation and flow understanding) and is then converted into a complete Django-based system with authentication, persistence, and analytics.

---

## Core Features

* **Habits**

  * Create habits with flexible frequency (daily / weekly / monthly)
  * Track completions and streaks

* **Todos**

  * Tasks with deadlines
  * Daily, weekly, or monthly recurrence

* **Analytics**

  * Visual insights into habits and task completion
  * Streaks, consistency, and trends

* **Path / Roadmap**

  * AI-generated roadmaps for goals (e.g., DSA)
  * Multiple chats per goal
  * Clickable checkpoints

* **Goals & Gamification**

  * Achievement-based goals (e.g., complete a habit 5 times in a row)
  * Points system and leaderboard

* **Home Dashboard**

  * Daily habit check-ins
  * Today’s tasks
  * Quick progress snapshot

* **Mobile Web App**

  * Installable PWA
  * Notifications and cross-device sync (backend phase)

---

## Backend Setup (Local Development)

### Prerequisites

* Python 3.10+
* Git

---

### Steps

```bash
cd backend

# create virtual environment (Optional)
python -m venv venv

# activate virtual environment (Windows)
venv\Scripts\activate

python -m pip install --upgrade pip

pip install -r requirements.txt

# apply migrations
python manage.py migrate

# start development server
python manage.py runserver
```
HOW TO RUN frontend 
Go to: 
cd habit-tracker/frontend/src
python -m http.server 5500

Open on your browser:

http://localhost:5500/index.html


Backend will be available at:

```
http://127.0.0.1:8000/
```

---

## Development Phases

### Phase 0 – Mini Prototype

* Frontend-only
* Uses browser storage (IndexedDB / cache)
* Purpose: UI/UX validation, navigation flow, data modeling clarity

### Phase 1 – Full Stack Application

* Django REST backend
* Persistent database
* Authentication and sync
* Leaderboards and AI integration

---

## Roles 

### Gitaansh
- Architecture & system design
- Data models and business logic
- Analytics and streak calculations
- Backend (Django REST) planning and implementation
- AI roadmap logicd

### Satyam
- UI/UX design
- Frontend implementation (HTML/CSS/JS)
- PWA setup (manifest, service worker)
- Responsive and mobile-first layout
- Visualizations and polish

---

## Structure
```
habit-tracker/
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   ├── manifest.json
│   │   └── sw.js
│   │
│   ├── src/
│   │   ├── index.html
│   │   ├── css/
│   │   │   ├── base.css
│   │   │   ├── layout.css
│   │   │   └── components.css
│   │   │
│   │   ├── js/
│   │   │   ├── app.js            # entry point
│   │   │   ├── router.js         # page switching
│   │   │   ├── state.js          # global state
│   │   │
│   │   │   ├── services/
│   │   │   │   ├── dataService.js
│   │   │   │   ├── habitService.js
│   │   │   │   ├── todoService.js
│   │   │   │   └── analyticsService.js
│   │   │
│   │   │   ├── views/
│   │   │   │   ├── home.js
│   │   │   │   ├── habits.js
│   │   │   │   ├── todos.js
│   │   │   │   ├── analytics.js
│   │   │   │   └── roadmap.js
│   │   │
│   │   │   ├── components/
│   │   │   │   ├── habitCard.js
│   │   │   │   ├── todoCard.js
│   │   │   │   ├── bottomNav.js
│   │   │   │   └── modal.js
│   │   │
│   │   │   └── utils/
│   │   │       ├── date.js
│   │   │       ├── streak.js
│   │   │       └── constants.js
│   │   │
│   │   └── assets/
│   │
│   └── vercel.json
│
├── backend/          # added later
│   ├── core/
│   ├── habits/
│   ├── todos/
│   ├── goals/
│   └── manage.py
│
└── README.md
```
---

## Stack 
### Frontend
- HTML, CSS, JavaScript
- IndexedDB (local persistence)
- Chart.js (analytics)
- PWA (Service Worker + Manifest)
### Backend (Planned)
- Django
- Django REST Framework
- PostgreSQL
- JWT Authentication

---

## Deployment
Frontend : github pages or vercel (static PWA hosting)
Backend : Render or Railway
Or maybe AWS

---

## Future 
tbd

---

## New Terms & Concepts

* **SPA (Single Page Application)** – One HTML entry point, JS-driven navigation
* **PWA (Progressive Web App)** – Installable, offline-capable web app
* **Manifest** – Metadata for app installation
* **Service Worker** – Offline caching and background behavior

---