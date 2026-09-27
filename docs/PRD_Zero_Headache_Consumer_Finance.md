# WealthSync Current Product Definition

**Status:** Implemented-product reference

**Updated:** 2026-09-28

This document describes the functionality present in the repository. It intentionally does not describe unimplemented product work.

## Product Purpose

WealthSync helps an authenticated user record financial activity and organize planned obligations in one web application. The product calculates dashboard totals, budget and planning data, safe-to-spend figures, a cash-flow timeline, and prioritized finance actions from the user's recorded data.

## Current User Capabilities

- Sign up, sign in, view and update profile information, change password, and upload an avatar.
- Create income sources and record income transactions.
- Create, filter, update, complete, and delete expense transactions.
- Create categories and monthly budget rules, then review a budget summary.
- Manage recurring bills, mark bills paid or unpaid, and receive stored notifications.
- Manage subscriptions and record usage counts.
- Create savings goals, record contributions, and view contribution logs.
- Calculate loan EMI values, manage loans, record loan payments, and view loan details.
- Track money lent to others, calculate interest, and record repayments.
- Manage electricity accounts, fetch supported provider bill data, and record electricity bill payments.
- Use the dashboard for totals, spending data, Sankey flow, recent activity, triage actions, timeline events, safe-to-spend data, and salary allocation data.
- Use Autopilot payment-order endpoints to prepare, approve, execute, cancel, and inspect internally tracked orders.

## Current Data Basis

Financial values are based on data a user enters or records in WealthSync. The application does not currently include direct bank-account aggregation, bank-SMS parsing, statement import, WhatsApp or Telegram ingestion, or a live external payment provider.

## Core Financial Concepts

| Concept | Current implementation |
| --- | --- |
| Transaction ledger | Income and expense records with completed, pending, or cancelled status. |
| Budgeting | User-owned categories and monthly budget rules. |
| Recurring obligations | Bills, subscriptions, active loans, and electricity bills. |
| Goals | Savings goals, planned monthly contribution, priority, and contribution logs. |
| Safe-to-spend | A calculated monthly and daily planning value exposed by Autopilot. |
| Triage | Deterministic prioritized actions based on cash flow, budgets, commitments, and transaction quality. |
| Payment orders | A stateful internal workflow with approval, execution, cancellation, idempotency, and history. |

## Trust and Limits

- The dashboard balance is derived from recorded transactions; it is not an independently verified bank balance.
- Financial calculations expose stored inputs through dashboard, timeline, and resource views.
- Autopilot payment orders are application records. A configured payment-provider integration is required for external payment execution.
- The product does not provide investment, tax, legal, or individualized financial advice.

## Current Technical Boundary

The frontend is React 19 with Vite, Tailwind CSS, Axios, React Router, Recharts, Framer Motion, and Lucide icons. The backend is FastAPI with async SQLAlchemy, Pydantic settings, PostgreSQL-compatible storage, Alembic migrations, JWT authentication, Redis/Celery scheduling, and optional Sentry reporting.

See the numbered reference chapters for the current code map and the API reference in Chapter 12.
