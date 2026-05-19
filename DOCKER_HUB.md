# 🐳 WealthSync — Docker Hub Deployment

Run WealthSync instantly using pre-built Docker images.

---

## Quick Start (Docker Compose)

### 1. Download the compose file

```bash
curl -O https://raw.githubusercontent.com/SatyaTejaChukka/wealth_sync/main/docker-compose.hub.yml
```

Or create a `docker-compose.yml` manually:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: wealth_sync_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: wealth_sync
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: wealth_sync_redis
    ports:
      - "6379:6379"
    restart: unless-stopped

  backend:
    image: satyatejachukka/wealthsync-backend:latest
    container_name: wealth_sync_backend
    environment:
      PROJECT_NAME: WealthSync
      POSTGRES_SERVER: db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: wealth_sync
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db/wealth_sync
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: change-this-to-a-random-secret-key
      BACKEND_CORS_ORIGINS: '["http://localhost:3000","http://localhost:80","http://localhost"]'
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  frontend:
    image: satyatejachukka/wealthsync-frontend:latest
    container_name: wealth_sync_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2. Start the stack

```bash
docker-compose up -d
```

### 3. Access the application

| Service          | URL                                              |
| ---------------- | ------------------------------------------------ |
| Frontend         | [http://localhost](http://localhost)              |
| Backend API      | [http://localhost:8000](http://localhost:8000)    |
| API Docs (Swagger) | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## Pull Images Manually

```bash
docker pull satyatejachukka/wealthsync-backend:latest
docker pull satyatejachukka/wealthsync-frontend:latest
```

---

## Docker Hub Links

- **Backend**: [hub.docker.com/r/satyatejachukka/wealthsync-backend](https://hub.docker.com/r/satyatejachukka/wealthsync-backend)
- **Frontend**: [hub.docker.com/r/satyatejachukka/wealthsync-frontend](https://hub.docker.com/r/satyatejachukka/wealthsync-frontend)

---

## Port Reference

| Service    | Port | Protocol |
| ---------- | ---- | -------- |
| Frontend   | 80   | HTTP (nginx) |
| Backend    | 8000 | HTTP     |
| PostgreSQL | 5432 | TCP      |
| Redis      | 6379 | TCP      |

---

## Environment Variables

### Backend

| Variable               | Default                | Description                                  |
| ---------------------- | ---------------------- | -------------------------------------------- |
| `SECRET_KEY`           | —                      | **Required.** JWT signing key                |
| `DATABASE_URL`         | Auto-built from parts  | Full async Postgres connection string        |
| `POSTGRES_USER`        | `postgres`             | Database username                            |
| `POSTGRES_PASSWORD`    | `postgres`             | Database password                            |
| `POSTGRES_DB`          | `wealth_sync`          | Database name                                |
| `POSTGRES_SERVER`      | `db`                   | Database hostname (service name in compose)  |
| `BACKEND_CORS_ORIGINS` | `[]`                   | JSON array of allowed frontend origins       |
| `REDIS_URL`            | `redis://redis:6379/0` | Redis connection string for Celery           |
| `ENVIRONMENT`          | `development`          | Set to `production` for production settings  |
| `AUTO_CREATE_TABLES`   | `True`                 | Auto-create tables on startup (dev only)     |

---

## Managing the Stack

```bash
# View running containers
docker-compose ps

# View backend logs
docker-compose logs -f backend

# Run database migrations
docker-compose exec backend alembic upgrade head

# Stop everything
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v
```
