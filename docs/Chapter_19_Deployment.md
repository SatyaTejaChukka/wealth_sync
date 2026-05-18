# Chapter 19: Deployment & DevOps

> **Production Ready**: Understanding Docker, environment config, and deployment strategies.

---

## Deployment Architecture

```
WealthSync Deployment
├── Frontend (Vite → Static files)
│   └── Deployed to: Vercel / Netlify / Render
├── Backend (FastAPI → Python server)
│   └── Deployed to: Render / Railway / Fly.io
└── Database (PostgreSQL)
    └── Managed: Render Postgres / Supabase
```

---

## 1. Environment Configuration

### Backend .env

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/wealthsync

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=11520  # 8 days

# CORS
BACKEND_CORS_ORIGINS=http://localhost:5173,https://your-frontend.com

# Environment
ENVIRONMENT=production
DEBUG=False
AUTO_CREATE_TABLES=False  # Use migrations!

# Sentry (optional)
SENTRY_DSN=https://...

# API Docs
ENABLE_DOCS=False  # Do NOT expose /docs in production
```

### Frontend .env

```bash
VITE_API_BASE_URL=https://api.your-backend.com/api/v1
```

**CRITICAL**: Never commit `.env` files! Add to `.gitignore`:

```gitignore
.env
.env.local
.env.production
```

---

## 2. Docker Setup

### Backend Dockerfile

```dockerfile
# Multi-stage build
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app /app

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Run**:

```bash
docker build -t wealthsync-backend .
docker run -p 8000:8000 --env-file .env wealthsync-backend
```

---

### Frontend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build for production
RUN npm run build

# Production stage (serve static files)
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
```

---

### docker-compose.yml (Local Development)

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: wealthsync
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: wealthsync_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    command: uvicorn app.main:app --reload --host 0.0.0.0
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://wealthsync:dev_password@db:5432/wealthsync_dev
      SECRET_KEY: dev-secret-key-not-for-production
      DEBUG: "True"
    depends_on:
      - db

  frontend:
    build: ./frontend
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1

volumes:
  postgres_data:
```

**Usage**:

```bash
docker-compose up -d  # Start all services
docker-compose logs -f backend  # View backend logs
docker-compose down  # Stop all services
```

---

## 3. Database Migrations (Alembic)

### Initialize Alembic

```bash
cd backend
alembic init alembic
```

### Create Migration

```bash
alembic revision --autogenerate -m "Add transaction status field"
```

### Apply Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Downgrade one version
alembic downgrade -1

# Show current version
alembic current
```

### Production Migration Flow

```bash
# 1. Test migrations locally
alembic upgrade head

# 2. Commit migration files
git add alembic/versions/*.py
git commit -m "Add migration: ..."

# 3. Deploy code

# 4. Run migrations on production
# (Set DATABASE_URL to production DB)
alembic upgrade head
```

---

## 4. Deployment to Render.com

### Backend Service

1. Create new Web Service
2. Connect GitHub repo
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `DATABASE_URL` (auto-injected if using Render Postgres)
     - `SECRET_KEY`
     - `BACKEND_CORS_ORIGINS`
     - `ENVIRONMENT=production`

### PostgreSQL Database

1. Create PostgreSQL instance
2. Copy connection string
3. Add as `DATABASE_URL` env var to backend service

### Frontend (Static Site)

1. Create Static Site
2. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`

---

## 5. CI/CD with GitHub Actions

### .github/workflows/deploy.yml

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest

  deploy-backend:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Build
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: "./frontend/dist"
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 6. Monitoring & Logging

### Sentry Error Tracking

**Backend**:

```python
import sentry_sdk

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=1.0
    )
```

**Frontend**:

```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### Health Check Endpoint

```python
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }
```

**Use in**: Load balancer health checks, uptime monitors (UptimeRobot)

---

## 7. Production Checklist

### Security

- [ ] Change `SECRET_KEY` to strong random value
- [ ] Set `DEBUG=False`
- [ ] Set `ENABLE_DOCS=False` (hide /docs)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set secure CORS origins (no `*`)
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Use environment variables for secrets (never commit)

### Database

- [ ] Use managed PostgreSQL (don't self-host for simplicity)
- [ ] Enable automatic backups
- [ ] Use connection pooling (`DB_POOL_SIZE`)
- [ ] Run migrations before deploy
- [ ] Monitor slow queries

### Performance

- [ ] Enable Gzip compression (nginx)
- [ ] Use CDN for static assets
- [ ] Optimize images (WebP format)
- [ ] Lazy load components (React.lazy)
- [ ] Monitor bundle size (keep under 200KB)

### Monitoring

- [ ] Set up Sentry for error tracking
- [ ] Add uptime monitoring (Pingdom, UptimeRobot)
- [ ] Monitor response times
- [ ] Set up alerts for errors

---

## 8. Scaling Strategies

### Horizontal Scaling

- **Load balancer** → Multiple backend instances
- **Database read replicas** for heavy read workloads
- **Redis cache** for session storage

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries (indexes)
- Use async operations (FastAPI already async!)

---

## Key Takeaways

1. **Environment variables**: Separate config from code
2. **Docker**: Containerize for consistency
3. **Migrations**: Alembic for database schema changes
4. **Render**: Easy deployment for Postgres + FastAPI + Static
5. **CI/CD**: GitHub Actions for automated deploys
6. **Sentry**: Error tracking in production
7. **Security**: HTTPS, strong secrets, disable debug mode

---

## Navigation

**Previous Chapter**: [← Chapter 18: Styling](./Chapter_18_Styling.md)

**Back to Index**: [📚 Tutorial Home](./README.md)

---

## 🎉 Congratulations!

You've completed the entire WealthSync tutorial covering all 19 chapters from system design to deployment. You now understand:

- System architecture and design patterns
- Every SQLAlchemy model and Pydantic schema
- Complete API layer with 58+ endpoints
- React setup, routing, and authentication
- All 34 UI components and 9 pages
- Production deployment strategies

**Next Steps**:

1. Build your own features
2. Customize the UI theme
3. Add new API endpoints
4. Deploy to production
5. Share with users!
