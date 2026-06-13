# Ani-Track

A self-hosted anime streaming app with a terminal-inspired TUI design — search, watch, track, and analyze your anime.

## Features

- **Search** — Search anime via AllAnime scraper, switch between SUB/DUB
- **Watch** — Built-in video player with quality selection, progress saving, auto-next episode
- **Library** — Track your anime with status (Watching/Completed/Planning/On-Hold/Dropped), episode progress, and scores
- **Statistics** — See your watching habits: totals, status breakdown, score distribution, top genres, recent activity
- **History** — Per-episode watch history grouped by anime with resume support
- **Continue Watching** — Carousel on the search page showing where you left off
- **Multi-user Auth** — Register, login, and per-user library/preferences/history
- **TUI Aesthetic** — Dark terminal-style UI (`#090b0e` bg, `#b83040` accent), monospace fonts, keyboard-friendly
- **ASCII Art** — Decorative ANSI art on every page matching the theme

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), SQLite |
| Video Proxy | AllAnime scraper, range-request streaming |
| Auth | JWT (python-jose), bcrypt |
| Fonts | Cinzel, DM Sans, JetBrains Mono, Noto Sans JP |
| Container | Docker multi-stage build (single container) |

## Quick Start

```bash
git clone <repo-url>
cd Ani-Track
docker compose up --build
```

Open **http://localhost:3000** in your browser.

To access from other devices on the same network, find your host IP:
```bash
ip addr | grep 'inet '
```
Then open `http://<YOUR_IP>:3000` from any device on the LAN.

## How to Use

### 1. Register / Login
Create an account at `/register`, then log in at `/login`.

### 2. Search & Watch
- **Search bar** — type an anime title, hit Enter. Results show title + episode count.
- **Hover ADD** on any result to add it to your library.
- **Click a result** to see its episode list, then click an episode to watch.
- **While watching** — select quality from the dropdown. Progress saves automatically every 5s. When an episode ends, the next one auto-plays with a countdown.

### 3. Library (`/library`)
Track all your anime. The three-panel layout:
- **Left sidebar** — filter by status (`a` = All, `w` = Watching, `c` = Completed, etc.)
- **Center table** — shows title, progress bar, score, status, type, last updated
- **Right detail panel** — click a row to open. Update episode count, change status, set a score (1-10), or remove from library

Keyboard navigation: `j`/`k` or arrows to move selection, `Escape` to close detail.

### 4. Statistics (`/stats`)
Aggregated stats from your library:
- Top stat boxes: entries, episodes watched, hours spent, average score
- Status breakdown bar, score distribution, top 8 genres, recent activity

### 5. History (`/history`)
All watch history grouped by anime with per-episode progress bars. Click **CONTINUE** to resume the latest partial episode.

### 6. Settings (`/settings`)
Set your default streaming quality and SUB/DUB preference.

## Project Structure

```
├── Dockerfile              # Multi-stage: frontend build → Python runtime
├── docker-compose.yml      # Single service, persistent /data volume
├── .dockerignore
├── backend/
│   ├── Dockerfile          # (legacy — root Dockerfile replaces this)
│   ├── requirements.txt
│   └── app/
│       ├── main.py         # FastAPI app, routers, static frontend serving
│       ├── config.py       # Settings via env vars
│       ├── database.py     # SQLAlchemy async engine + init_db
│       ├── auth/           # JWT auth, login/register routes
│       ├── models/         # SQLAlchemy models: User, WatchHistory, Preferences, AnimeLibrary
│       └── routers/        # API routes: anime, stream, preferences, library
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile          # (legacy)
│   ├── nginx.conf          # (legacy)
│   └── src/
│       ├── App.tsx         # Main app shell, routing, nav bar
│       ├── api/client.ts   # API client with JWT
│       ├── types/index.ts  # TypeScript interfaces
│       ├── hooks/          # useAuth hook
│       ├── pages/          # All page components
│       ├── components/     # UI components + AnsiArt
│       └── styles/         # Theme CSS, globals
└── data/                   # SQLite database (auto-created, gitignored)
```

## Configuration

Environment variables for `docker-compose.yml`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:////data/ani-track.db` | SQLite database path |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (set to `*` for LAN access) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `43200` (30 days) | JWT token lifetime |
| `ALLANIME_REFR` | `https://youtu-chan.com` | AllAnime referer |
| `ALLANIME_BASE` | `allanime.day` | AllAnime base domain |
| `ALLANIME_API` | `https://api.allanime.day` | AllAnime API endpoint |

## Running Without Docker

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (dev mode)
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:8000`.

## Building

```bash
docker compose build
```

Or manually:
```bash
cd frontend && npm ci && npm run build
cd ../backend && pip install -r requirements.txt
cd .. && cp -r frontend/dist backend/static
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 80
```
