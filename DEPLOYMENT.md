# 🚀 WealthSync — Production Deployment Guide

Deploy WealthSync with **Vercel** (frontend), **Render** (backend), and **Supabase** (database).

---

## 📋 Prerequisites

| Service                              | Purpose          |
| ------------------------------------ | ---------------- |
| [GitHub](https://github.com)         | Source repository |
| [Supabase](https://supabase.com)     | PostgreSQL database |
| [Render](https://render.com)         | Backend hosting  |
| [Vercel](https://vercel.com)         | Frontend hosting |

---

## Step 1 — Database (Supabase)

1. Create a new project in [Supabase](https://supabase.com/dashboard).
2. Note your **project password** — this is your Postgres password.
3. Go to **Project Settings → Database** and copy the **Connection String** (URI format).
   - Format: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
4. If your password contains special characters (e.g., `@`), URL-encode them (e.g., `@` → `%40`).

> **Tip**: Supabase provides a free tier with 500MB storage — sufficient for personal finance tracking.

---

## Step 2 — Backend (Render)

1. Log in to [Render](https://render.com) and click **New → Web Service**.
2. Connect your `wealth_sync` GitHub repository.
3. Configure the service:

| Setting            | Value                        |
| ------------------ | ---------------------------- |
| **Name**           | `WealthSync`                 |
| **Root Directory** | `backend`                    |
| **Runtime**        | `Python 3`                   |
| **Build Command**  | `pip install -r requirements.txt && alembic upgrade head` |
| **Start Command**  | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

4. Add **Environment Variables**:

| Variable                      | Value                                           | Notes                          |
| ----------------------------- | ----------------------------------------------- | ------------------------------ |
| `DATABASE_URL`                | `postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres?ssl=require` | URL-encode special chars in password |
| `SECRET_KEY`                  | *(generate a random 32+ char string)*           | Used for JWT signing           |
| `ENVIRONMENT`                 | `production`                                    |                                |
| `AUTO_CREATE_TABLES`          | `False`                                         | Alembic handles migrations     |
| `BACKEND_CORS_ORIGINS`        | `["https://your-app.vercel.app"]`               | JSON array of allowed origins  |
| `ALLOWED_HOSTS`               | `["your-service.onrender.com"]`                 | JSON array of allowed hosts    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `11520`                                         | 8 days (optional)              |
| `RATE_LIMIT_LOGIN`            | `5/minute`                                      | Optional                       |
| `RATE_LIMIT_SIGNUP`           | `3/minute`                                      | Optional                       |
| `REDIS_URL`                   | *(leave empty if not using Celery)*             | Optional                       |
| `SENTRY_DSN`                  | *(your Sentry DSN)*                             | Optional error monitoring      |

5. Click **Deploy**. Render will build and start the service automatically.
6. Copy the deployed URL (e.g., `https://wealthsync.onrender.com`).

### Important Notes

- Use `ssl=require` in the DATABASE_URL (not `sslmode=require`) — asyncpg requires the `ssl` parameter.
- `BACKEND_CORS_ORIGINS` and `ALLOWED_HOSTS` must be valid JSON arrays (e.g., `["https://example.com"]`).
- The build command includes `alembic upgrade head` to run migrations on every deploy.

---

## Step 3 — Frontend (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New → Project**.
2. Import your `wealth_sync` repository.
3. Configure build settings:

| Setting              | Value              |
| -------------------- | ------------------ |
| **Framework Preset** | Vite               |
| **Root Directory**   | `frontend`         |
| **Build Command**    | `npm run build:prod` |
| **Output Directory** | `dist`             |
| **Install Command**  | `npm install`      |

4. Add **Environment Variables**:

| Variable            | Value                                                      |
| ------------------- | ---------------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://wealthsync.onrender.com/api/v1`                   |
| `VITE_ENVIRONMENT`  | `production`                                               |

5. Click **Deploy**.

---

## Step 4 — Post-Deployment Configuration

1. **Update CORS**: Go back to Render and update `BACKEND_CORS_ORIGINS` with your actual Vercel URL:
   ```
   ["https://your-app.vercel.app"]
   ```
   Redeploy the backend.

2. **Verify**:
   - Open your Vercel URL → you should see the landing page
   - Sign up for a new account → you should be auto-redirected to the dashboard
   - Add income, transactions, bills → data should persist across page reloads
   - Check the health score gauge on the dashboard

3. **Custom Domain** (optional):
   - Vercel: Settings → Domains → add your domain
   - Render: Settings → Custom Domains → add your domain
   - Update `BACKEND_CORS_ORIGINS` and `ALLOWED_HOSTS` to include the new domain

---

## 🛡️ Troubleshooting

| Problem                        | Solution                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| **CORS errors**                | Ensure `BACKEND_CORS_ORIGINS` exactly matches your frontend URL (no trailing slash)          |
| **Database connection fails**  | Check `DATABASE_URL` uses `ssl=require`, password special chars are URL-encoded              |
| **Build fails on Render**      | Verify `requirements.txt` is in the `backend/` directory and all packages install cleanly    |
| **Alembic migration fails**    | Check database connectivity; ensure no conflicting migrations                                 |
| **Frontend blank page**        | Verify `VITE_API_BASE_URL` points to the correct backend URL with `/api/v1` suffix           |
| **Login/Signup 422 errors**    | Ensure `SECRET_KEY` is set on the backend; check request payload matches schema              |
| **Health check fails**         | Hit `https://your-backend.onrender.com/health` — should return `{"status": "healthy"}`       |

---

## Alternative: Self-Hosted (Docker Hub)

If you prefer to self-host instead of using Render/Vercel, pre-built Docker images are available:

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/SatyaTejaChukka/wealth_sync/main/docker-compose.hub.yml

# Start the full stack (PostgreSQL + Redis + Backend + Frontend)
docker-compose -f docker-compose.hub.yml up -d
```

**Important**: Edit the `SECRET_KEY` in the compose file before running in production.

| Service          | URL                                           |
| ---------------- | --------------------------------------------- |
| Frontend         | [http://localhost](http://localhost)           |
| Backend API      | [http://localhost:8000](http://localhost:8000) |
| API Docs         | [http://localhost:8000/docs](http://localhost:8000/docs) |

```bash
# Stop the stack
docker-compose -f docker-compose.hub.yml down

# Stop and delete all data
docker-compose -f docker-compose.hub.yml down -v
```

Docker Hub images:
- [`satyatejachukka/wealthsync-backend`](https://hub.docker.com/r/satyatejachukka/wealthsync-backend)
- [`satyatejachukka/wealthsync-frontend`](https://hub.docker.com/r/satyatejachukka/wealthsync-frontend)
