# ⚡ Quick Start Guide

Get WealthSync running locally in under 5 minutes.

---

## Option 1 — Automated Setup (Windows)

```powershell
git clone https://github.com/SatyaTejaChukka/wealth_sync.git
cd wealth_sync
.\setup.ps1
```

The script will:

1. Check that Docker is installed and running
2. Create a `.env` file with default configuration
3. Build and start all Docker containers (PostgreSQL, Redis, Backend)
4. Run database migrations via Alembic
5. Install frontend npm dependencies

Once complete:

| Service          | URL                                               |
| ---------------- | ------------------------------------------------- |
| Frontend         | [http://localhost:3000](http://localhost:3000) (run `cd frontend && npm run dev`) |
| Backend API Docs | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## Option 2 — Docker Compose (Linux / macOS)

git clone https://github.com/SatyaTejaChukka/wealth_sync.git
cd wealth_sync
cd wealth_sync

# Start infrastructure
docker-compose up -d --build

# Run database migrations
docker-compose exec backend alembic upgrade head

# Start frontend dev server
cd frontend
npm install
npm run dev
```

---

## Option 3 — Manual Setup (No Docker)

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15 running locally

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local Postgres

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## First Steps After Setup

1. Open the app in your browser
2. Click **Get Started** on the landing page
3. Create a new account — you'll be auto-redirected to the dashboard
4. Add your first **income source** (Settings or Income page)
5. Log some **transactions** to see analytics populate
6. Set up **budget rules** and **savings goals**
7. Check your **Financial Health Score** on the dashboard

---

## Troubleshooting

| Problem                            | Solution                                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| Docker containers won't start      | Ensure Docker Desktop is running and port 5432 is free           |
| Database connection refused        | Check PostgreSQL is running and `.env` DATABASE_URL is correct   |
| Frontend shows "Network Error"     | Ensure backend is running at `localhost:8000`                    |
| Migrations fail                    | Check DATABASE_URL; try `alembic downgrade base` then `upgrade head` |
| `SECRET_KEY` error on startup      | Add `SECRET_KEY=any-random-string` to your `.env` file           |
