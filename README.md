# WealthSync

WealthSync is a personal-finance web application for recording money activity, organizing recurring obligations, and viewing a calculated cash-flow picture from the data a user has recorded.

## Current Product Scope

- Record, filter, update, complete, and delete income and expense transactions.
- Create budget categories and rules, then view budget summaries.
- Manage income sources, bills, subscriptions, savings goals, loans, and money lent to others.
- Track electricity accounts and bills through the supported electricity-service workflow.
- View dashboard totals, recent activity, spending charts, financial triage, timeline events, safe-to-spend figures, and salary-rule allocation data.
- Prepare, approve, execute, cancel, and inspect internally tracked Autopilot payment orders.
- Manage profile details, avatar, password, notifications, and calendar events.

The application is a ledger and planning tool. Its displayed balances are calculated from recorded transactions. It does not connect to a user's bank account, ingest bank SMS, run WhatsApp or Telegram bots, or execute payments through a live banking provider.

## Architecture

~~~
React 19 + Vite + Tailwind CSS
          |
          | HTTPS JSON API with JWT bearer token
          v
FastAPI + SQLAlchemy async services
          |
          +-- PostgreSQL-compatible database
          +-- Redis and Celery for scheduled bill automation
          +-- Optional Sentry error reporting
~~~

The backend is organized into thin API routes, services for finance calculations and integrations, SQLAlchemy models, and Pydantic schemas. The frontend is a React SPA with authenticated dashboard routes, Axios services, reusable UI components, and a responsive desktop sidebar/mobile navigation layout.

## Repository Layout

~~~
backend/
  app/api/v1/       FastAPI routes
  app/models/       SQLAlchemy models
  app/schemas/      Pydantic request and response schemas
  app/services/     Finance, payment, lending, and electricity logic
  app/tasks/        Celery bill automation task
  tests/            API and service integration tests
frontend/
  src/pages/        Public and dashboard pages
  src/components/   Reusable UI and feature components
  src/services/     Axios API clients
  src/lib/          Auth, API, formatting, and utility helpers
docs/                Current implementation reference and proposal documents
~~~

## Local Development

### Backend

~~~powershell
cd backend
Copy-Item .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
~~~

The backend reads settings from backend/.env. Set a non-default SECRET_KEY and database settings before using shared or production environments.

### Frontend

~~~powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
~~~

The frontend defaults to http://localhost:8000/api/v1. Set VITE_API_BASE_URL when the API runs elsewhere.

### Containers and tests

The repository includes docker-compose.yml, production-oriented compose files, backend/Dockerfile, backend/render.yaml, and frontend/vercel.json.

~~~powershell
cd backend
python -m pytest

cd ..\frontend
npm run build
~~~

GitHub Actions currently builds the frontend and checks that the FastAPI application imports successfully on Python 3.11.

## Documentation

The numbered chapters in docs/ describe the implemented application. They are reference material, not future-product plans. Proposal documents are kept separately and are clearly marked as proposed.

- Current Product Definition: docs/PRD_Zero_Headache_Consumer_Finance.md
- Architecture Reference: docs/Chapter_01_Introduction_and_Architecture.md
- API Reference: docs/Chapter_12_API_Routes.md
- Coverage Audit: docs/coverage_audit.md
