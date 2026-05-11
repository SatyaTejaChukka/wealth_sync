# 💰 WealthSync — Personal Finance Platform

A comprehensive, full-stack personal finance management system built with **FastAPI** and **React**. Track income, expenses, bills, subscriptions, savings goals, and get an intelligent financial health score — all in a polished dark glassmorphism UI.

---

## ✨ Features

### Core Finance

- **Income Tracking** — Manage multiple income sources (salary, freelance, dividends)
- **Expense Tracking** — Daily transaction logging with category tagging
- **Bill Management** — Recurring bill tracking with due-day reminders and autopay flags
- **Subscription Tracker** — Monitor recurring subscriptions with billing cycle tracking

### Smart Budgeting

- **Budget Rules** — Create fixed-amount or percentage-based budget allocations per category
- **Daily Spendable** — Calculates your "safe to spend" daily limit based on income, bills, and allocations
- **Budget Summary** — Monthly overview of allocated vs. spent per category

### Savings & Goals

- **Savings Goals** — Set targets with deadlines, contribute funds, and track progress visually
- **Contribution History** — Full log of contributions per goal with timestamps

### Intelligence

- **Financial Health Score** — 0–100 score based on spending ratio, missed bills, savings progress, and budget adherence
- **Health Score Gauge** — Animated circular gauge with grade (A+ to F) and personalized recommendations
- **Dashboard Analytics** — Spending charts, category breakdowns, and recent activity feed

### User Experience

- **Toast Notifications** — Professional slide-in toasts for all CRUD operations (success, error, warning, info)
- **Optimistic Updates** — Instant UI feedback on delete/update operations with automatic rollback on failure
- **Auto-Login on Signup** — Seamless onboarding; new users land directly on the dashboard
- **Dark Glassmorphism UI** — Frosted glass effects, violet-to-indigo gradients, zinc-900 foundations
- **Responsive Design** — Works across desktop and mobile viewports

---

## 🛠️ Tech Stack

| Layer          | Technology                                                      |
| -------------- | --------------------------------------------------------------- |
| **Frontend**   | React 19, React Router 7, Tailwind CSS 4, Recharts, Framer Motion |
| **Backend**    | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy (async)           |
| **Database**   | PostgreSQL 15 (via asyncpg)                                     |
| **Auth**       | JWT (python-jose), Argon2 password hashing                      |
| **Migrations** | Alembic                                                         |
| **Task Queue** | Celery + Redis (optional)                                       |
| **Build Tool** | Vite (rolldown-vite)                                            |
| **Deployment** | Render (backend), Vercel (frontend), Supabase/Neon (database)   |
| **Dev Infra**  | Docker Compose, PowerShell setup script                         |

---

## 📁 Project Structure

```
wealth_sync/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # 12 route modules (auth, bills, budgets, etc.)
│   │   ├── core/            # Config, database, security, middleware
│   │   ├── models/          # SQLAlchemy models (10 entities)
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (budget engine, health score)
│   │   ├── tasks/           # Celery background tasks
│   │   └── static/avatars/  # User avatar uploads
│   ├── alembic/versions/    # Database migrations
│   ├── tests/               # Pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # 25 reusable components (UI, dashboard, etc.)
│   │   ├── pages/           # 8 page views (Landing, Login, Dashboard, etc.)
│   │   ├── services/        # 9 API service modules
│   │   ├── lib/             # Auth context, API client, utilities
│   │   └── layouts/         # MainLayout with Sidebar
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Local development stack
├── docker-compose.hub.yml   # Pre-built image deployment
├── setup.ps1                # Windows one-click setup
└── DEPLOYMENT.md            # Production deployment guide
```

---

## 🚀 Getting Started

### Prerequisites

- **Docker & Docker Compose** (recommended) — _or_ Node.js 18+ and Python 3.11+
- PostgreSQL 15 (if running without Docker)

### Quick Start (Docker)

```bash
git clone https://github.com/SatyaTejaChukka/wealth_sync.git
cd wealth_sync
```

**Windows:**
```powershell
.\setup.ps1
```

**Linux / macOS:**
```bash
docker-compose up -d --build
docker-compose exec backend alembic upgrade head
cd frontend && npm install && npm run dev
```

Once running:

| Service          | URL                                                |
| ---------------- | -------------------------------------------------- |
| Frontend         | [http://localhost:3000](http://localhost:3000)      |
| Backend API Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |

### Manual Development Setup

<details>
<summary><strong>Backend</strong></summary>

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

</details>

<details>
<summary><strong>Frontend</strong></summary>

```bash
cd frontend
npm install
npm run dev
```

</details>

---

## ⚙️ Environment Configuration

WealthSync uses `.env` files for configuration. Example files are provided — copy and edit them:

```bash
# Root-level (has both backend + frontend vars)
cp .env.example backend/.env

# Frontend-specific
cp frontend/.env.example frontend/.env
```

### Backend Variables (`backend/.env`)

| Variable                      | Required | Default                  | Description                                                        |
| ----------------------------- | -------- | ------------------------ | ------------------------------------------------------------------ |
| `SECRET_KEY`                  | **Yes**  | —                        | JWT signing key. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL`                | No       | Auto-built from parts    | Full async Postgres URL. Overrides individual `POSTGRES_*` vars    |
| `POSTGRES_SERVER`             | No       | `db`                     | Database hostname (`localhost` local, `db` in Docker)              |
| `POSTGRES_USER`               | No       | `postgres`               | Database username                                                  |
| `POSTGRES_PASSWORD`           | No       | `postgres`               | Database password                                                  |
| `POSTGRES_DB`                 | No       | `wealth_sync`            | Database name                                                      |
| `ENVIRONMENT`                 | No       | `development`            | `development` or `production`                                      |
| `DEBUG`                       | No       | `False`                  | Enable verbose error responses                                     |
| `ENABLE_DOCS`                 | No       | `True`                   | Expose `/docs` Swagger UI                                          |
| `AUTO_CREATE_TABLES`          | No       | `True`                   | Auto-create tables on startup (use `False` in production)          |
| `BACKEND_CORS_ORIGINS`        | No       | `[]`                     | JSON array of allowed frontend origins                             |
| `ALLOWED_HOSTS`               | No       | `[]`                     | JSON array of allowed host headers                                 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No       | `11520`                  | JWT token lifetime (default: 8 days)                               |
| `RATE_LIMIT_LOGIN`            | No       | `5/minute`               | Max login attempts per IP per minute                               |
| `RATE_LIMIT_SIGNUP`           | No       | `3/minute`               | Max signup attempts per IP per minute                              |
| `DB_POOL_SIZE`                | No       | `5`                      | SQLAlchemy connection pool size                                    |
| `DB_MAX_OVERFLOW`             | No       | `10`                     | Extra connections allowed under load                               |
| `REDIS_URL`                   | No       | `redis://redis:6379/0`   | Redis URL for Celery task queue (optional)                         |
| `SENTRY_DSN`                  | No       | —                        | Sentry error monitoring DSN (optional)                             |

<details>
<summary><strong>Example backend/.env for local development</strong></summary>

```dotenv
SECRET_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
ENVIRONMENT=development
DEBUG=False
ENABLE_DOCS=True
AUTO_CREATE_TABLES=True

POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=wealth_sync
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost/wealth_sync

BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
ALLOWED_HOSTS=[]

REDIS_URL=redis://localhost:6379/0
SENTRY_DSN=
```

</details>

<details>
<summary><strong>Example backend/.env for production (Supabase + Render)</strong></summary>

```dotenv
SECRET_KEY=your-production-secret-key-here
ENVIRONMENT=production
DEBUG=False
ENABLE_DOCS=False
AUTO_CREATE_TABLES=False

DATABASE_URL=postgresql://postgres:YourP%40ssword@db.xxxx.supabase.co:5432/postgres?ssl=require

BACKEND_CORS_ORIGINS=["https://your-app.vercel.app"]
ALLOWED_HOSTS=["your-service.onrender.com"]

REDIS_URL=
SENTRY_DSN=
```

> **Notes:**
> - Use `ssl=require` (not `sslmode=require`) — asyncpg requires the `ssl` parameter
> - URL-encode special characters in passwords (e.g., `@` → `%40`, `#` → `%23`)
> - Set `AUTO_CREATE_TABLES=False` and rely on Alembic migrations in production

</details>

### Frontend Variables (`frontend/.env`)

| Variable           | Required | Default                          | Description                              |
| ------------------ | -------- | -------------------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL`| **Yes**  | `http://localhost:8000/api/v1`   | Backend API URL (must include `/api/v1`) |
| `VITE_ENVIRONMENT` | No       | `development`                    | Environment label                        |

> All frontend env vars must be prefixed with `VITE_` to be accessible in client code.

---

## 🌐 Deployment

See the full **[Deployment Guide →](DEPLOYMENT.md)** for step-by-step instructions.

| Component    | Recommended Host         |
| ------------ | ------------------------ |
| Frontend     | Vercel                   |
| Backend      | Render                   |
| Database     | Supabase or Neon         |

### Docker Hub (Self-Hosted)

Pre-built images are available on Docker Hub for quick self-hosted deployment:

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/SatyaTejaChukka/wealth_sync/main/docker-compose.hub.yml

# Start the full stack
docker-compose -f docker-compose.hub.yml up -d

# Access at http://localhost (frontend) and http://localhost:8000/docs (API)
```

Images:
- [`satyatejachukka/wealthsync-backend`](https://hub.docker.com/r/satyatejachukka/wealthsync-backend)
- [`satyatejachukka/wealthsync-frontend`](https://hub.docker.com/r/satyatejachukka/wealthsync-frontend)

---

## 🔌 API Endpoints

All endpoints are under `/api/v1`. Interactive docs available at `/docs` (Swagger UI).

| Module          | Prefix               | Description                          |
| --------------- | --------------------- | ------------------------------------ |
| Auth            | `/auth`               | Signup, login, current user          |
| Users           | `/users`              | Profile management, avatar upload    |
| Income          | `/income`             | Income source CRUD                   |
| Transactions    | `/transactions`       | Expense/income transaction logging   |
| Categories      | `/categories`         | Spending categories                  |
| Budgets         | `/budgets`            | Budget rules and monthly summaries   |
| Bills           | `/bills`              | Recurring bill tracking              |
| Subscriptions   | `/subscriptions`      | Subscription management              |
| Goals           | `/goals`              | Savings goals with contribution logs |
| Dashboard       | `/dashboard`          | Aggregated summary and analytics     |
| Notifications   | `/notifications`      | User notification feed               |
| Health Score    | `/health`             | Financial health score calculation   |
| Autopilot       | `/autopilot`          | Automated financial planning engine  |

---

## 📄 License

This project is for personal and educational use.
