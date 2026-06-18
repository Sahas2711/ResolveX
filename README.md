# ResolveX

<div align="center">

![ResolveX](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/next.js-14-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**Intelligent Complaint & Ticket Management Platform**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Core Concepts](#core-concepts)
  - [Auto‑Assignment Engine](#auto‑assignment-engine)
  - [Complaint Lifecycle](#complaint-lifecycle)
  - [Role‑Based Access Control (RBAC)](#role‑based-access-control-rbac)
  - [SLA Tracking & Breach Detection](#sla-tracking--breach-detection)
- [Dashboards & Analytics](#dashboards--analytics)
- [Webhooks & Events](#webhooks--events)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ResolveX is a full‑stack, enterprise‑grade complaint management system that automates ticket routing, enforces role‑based permissions, and delivers real‑time analytics. Built with **Next.js 14** (App Router) and **PostgreSQL**, it offers a seamless experience for customers, support agents, team leads, product managers, and administrators.

The platform enables:

- Customers to submit complaints against multiple products.
- Automatic assignment of tickets to the most suitable team member using a **least‑load algorithm**.
- Complete ticket lifecycle management with strict state transition validations.
- Immutable audit trails and timeline views for every action.
- Comprehensive dashboards for individuals, teams, products, and executives.
- Webhook integrations for external systems.

---

## Key Features

- **Multi‑product support** – Products have categories, SLA rules, and dedicated teams.
- **Auto‑assignment engine** – Instantly routes new complaints based on product‑team mappings and agent workload.
- **Ticket lifecycle** – Open → Assigned → In Progress → Waiting for Customer → Resolved → Closed (with Reopen and Escalated states).
- **RBAC** – Five predefined roles with fine‑grained permission scopes (`complaint:create`, `complaint:reassign`, etc.).
- **Audit logging** – Every status change, assignment, comment, and attachment is recorded in immutable logs.
- **Unified timeline** – Chronological view of all events on a complaint.
- **File attachments** – Secure upload of images, PDFs, and documents (max 10 MB).
- **Notifications** – In‑app notifications for assignments, escalations, and comments; mark as read in bulk.
- **Search & filtering** – Global full‑text search combined with multi‑value filters (status, priority, severity, date range, SLA status).
- **Dashboards** – Staff productivity, team workload, product complaint trends, and executive KPIs.
- **Webhooks** – Subscribe to `complaint.created`, `complaint.assigned`, `complaint.status_changed`, and `complaint.sla_breached`.
- **Versioned API** – All endpoints under `/api/v1/` with OpenAPI 3.1 documentation.

---

## Architecture

ResolveX follows a **monolithic Next.js** architecture, using the App Router for both the frontend and the REST API. The database is a single PostgreSQL instance, accessed through Prisma ORM. Authentication is stateless JWT with refresh token rotation.

```mermaid
graph TD
    A[Client Browser] -->|HTTPS| B[Next.js App Router]
    B --> C[React Server Components / Pages]
    B --> D[API Routes /api/v1/*]
    B --> E[Middleware: Auth, Rate Limiting]
    D --> F[Prisma ORM]
    F --> G[(PostgreSQL)]
    D --> H[Cloud Storage: S3/R2]
    D --> I[Webhook Dispatcher]
    I --> J[External Services]
    E --> K[Redis (optional, rate limiting)]
```

- **Frontend** – Hybrid rendering: server components for static content, client components for interactive parts (forms, tables, dashboards).
- **Backend** – API routes co‑located inside `app/api/v1/`; each route handler is a serverless function (or Node.js server).
- **Caching** – Next.js built‑in data cache for dashboard queries; Redis can be used for rate limiting and session store.
- **Jobs** – Background SLA breach checks and assignment load recalculation can be implemented via cron jobs (e.g., Vercel Cron Jobs or a separate scheduler).

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ COMPLAINTS : submits
    USERS ||--o{ COMPLAINT_COMMENTS : writes
    USERS ||--o{ COMPLAINT_ATTACHMENTS : uploads
    USERS ||--o{ NOTIFICATIONS : receives
    ROLES ||--o{ USER_ROLES : assigned_to
    ROLES ||--o{ ROLE_PERMISSIONS : has
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : belongs_to
    PRODUCTS ||--o{ PRODUCT_CATEGORIES : categorized_by
    PRODUCTS ||--o{ SLA_RULES : defines
    PRODUCTS ||--o{ PRODUCT_TEAM_MAPPINGS : mapped_to
    TEAMS ||--o{ PRODUCT_TEAM_MAPPINGS : mapped_to
    TEAMS ||--o{ TEAM_MEMBERS : includes
    COMPLAINTS ||--o{ COMPLAINT_ASSIGNMENTS : has
    COMPLAINTS ||--o{ COMPLAINT_COMMENTS : has
    COMPLAINTS ||--o{ COMPLAINT_ATTACHMENTS : has
    COMPLAINTS ||--o{ COMPLAINT_STATUS_HISTORY : records
    COMPLAINTS ||--o{ COMPLAINT_TIMELINE : chronicles
    TEAMS ||--o{ COMPLAINTS : assigned_to
    USERS ||--o{ COMPLAINTS : assigned_agent
```

---

## Tech Stack

| Category            | Technology                                      |
|---------------------|-------------------------------------------------|
| **Framework**       | Next.js 14 (App Router)                         |
| **Language**        | TypeScript                                      |
| **Database**        | PostgreSQL 15+                                  |
| **ORM**             | Prisma                                          |
| **Authentication**  | JWT (access + refresh), bcrypt                  |
| **UI**              | Tailwind CSS, shadcn/ui, Recharts               |
| **File Storage**    | AWS S3 / Cloudflare R2                          |
| **Rate Limiting**   | Upstash Ratelimit (or in‑memory)                |
| **Validation**      | Zod                                             |
| **Deployment**      | Vercel / Docker                                 |
| **CI/CD**           | GitHub Actions                                  |

---

## Getting Started

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 15+ (local or cloud)
- (Optional) Redis for rate limiting
- (Optional) AWS S3 or Cloudflare R2 bucket for file uploads

### Installation

```bash
git clone https://github.com/your-org/resolvex.git
cd resolvex
npm install
```

### Environment Variables

Create a `.env.local` file at the root with the following keys:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/resolvex"
JWT_SECRET="your-256-bit-secret"
JWT_REFRESH_SECRET="your-different-256-bit-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
UPLOAD_BUCKET="resolvex-uploads"          # optional
UPLOAD_REGION="auto"                      # optional
UPLOAD_ENDPOINT="https://..."             # optional
REDIS_URL="redis://localhost:6379"        # optional
```

### Database Setup

Apply all migrations and seed default roles/permissions:

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed script creates five roles (`CUSTOMER`, `SUPPORT_AGENT`, `TEAM_LEAD`, `PRODUCT_MANAGER`, `ADMIN`) and all necessary permissions.

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.  
The API is accessible at `http://localhost:3000/api/v1`.

---

## Project Structure

```
src/
├── app/                          # App Router
│   ├── (auth)/                   # Login, register pages
│   ├── (dashboard)/              # Authenticated dashboard pages
│   ├── api/v1/                   # REST API endpoints
│   │   ├── auth/                 # register, login, refresh, logout
│   │   ├── users/                # CRUD & roles
│   │   ├── roles/                # Role management
│   │   ├── permissions/          # Permission list
│   │   ├── products/             # Product, SLA, categories, teams
│   │   ├── teams/                # Team & members
│   │   ├── complaints/           # Core lifecycle
│   │   ├── notifications/        # Read/unread
│   │   ├── dashboard/            # KPI endpoints
│   │   ├── analytics/            # Performance summaries
│   │   ├── system/               # Settings
│   │   └── webhooks/             # Subscriptions
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── forms/                    # Reusable form fields
│   ├── complaints/               # Ticket list, detail, timeline
│   └── dashboard/                # Stat cards, charts
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # JWT helpers, password hashing
│   ├── rate-limit.ts             # Rate limiting config
│   ├── assignment-engine.ts      # Auto‑assignment logic
│   ├── status-machine.ts         # Allowed state transitions
│   └── validators.ts             # Zod schemas
├── hooks/                        # Custom React hooks
├── styles/                       # Global styles
└── middleware.ts                  # Auth & rate‑limiting middleware
```

---

## API Overview

All API endpoints are documented interactively via **Swagger UI** at `/api/docs`. A high‑level grouping:

| Group            | Description                                 |
|------------------|---------------------------------------------|
| **Auth**         | Register, login, refresh, logout            |
| **Users**        | Admin CRUD, role assignment                 |
| **Roles**        | Create, update, delete roles & permissions  |
| **Permissions**  | List all available permissions              |
| **Products**     | Manage products, categories, SLA rules, teams|
| **Teams**        | Team and member management                  |
| **Complaints**   | Ticket CRUD, status changes, comments, attachments, timeline |
| **Notifications**| In‑app notifications, mark read             |
| **Dashboard**    | Staff, team, product, executive KPIs        |
| **Analytics**    | Aggregated performance across entities      |
| **System**       | Global configuration                        |
| **Webhooks**     | Manage event subscriptions                  |

All responses are wrapped in a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "totalItems": 100, "totalPages": 5 }
}
```

Pagination, sorting, and advanced filtering are supported on list endpoints.

---

## Core Concepts

### Auto‑Assignment Engine

When a complaint is submitted:

1. **Identify product** – Extract `productId` from the request.
2. **Find responsible team** – Look up `product_team_mappings` (primary team first, then weighted).
3. **Select agent (least load)** – For the target team, count open/assigned complaints per member. Pick the agent with the fewest active tickets (weighted by `load_weight`).
4. **Record assignment** – Insert into `complaint_assignments` with `assigned_by = 'system'`.
5. **Set SLA deadlines** – Based on the product’s SLA rule for the complaint’s severity & priority.
6. **Notify** – Create an in‑app notification for the assigned agent and fire `complaint.assigned` webhook.

Manual reassignment (`POST /complaints/{id}/assign`) overrides this and logs who made the change.

### Complaint Lifecycle

Allowed transitions are strictly enforced by a state machine:

| Current Status         | Possible Next Statuses                             |
|------------------------|----------------------------------------------------|
| `open`                 | `assigned`, `closed` (admin only)                  |
| `assigned`             | `in_progress`, `escalated`, `closed`               |
| `in_progress`          | `waiting_for_customer`, `resolved`, `escalated`    |
| `waiting_for_customer` | `in_progress`, `resolved`, `closed`                |
| `resolved`             | `closed`, `reopened`                               |
| `reopened`             | `assigned`, `in_progress`, `closed`                |
| `closed`               | `reopened`                                         |
| `escalated`            | `assigned`, `in_progress`, `resolved`              |

Any invalid transition returns a `409 Conflict` error.

### Role‑Based Access Control (RBAC)

Five roles are pre‑defined, each with a set of permissions scopes (e.g., `complaint:create`, `dashboard:team`).  
A user may have multiple roles; the effective permissions are the union of all roles.

| Role              | Key Permissions                                              |
|-------------------|--------------------------------------------------------------|
| **Customer**      | Create complaint, view own tickets                           |
| **Support Agent** | View assigned/all tickets, update status, add comments       |
| **Team Lead**     | Agent rights + reassign, escalate, view team dashboard       |
| **Product Manager**| Full product management, product analytics                  |
| **Admin**         | Everything – user/role/permission management, system settings|

Permission enforcement is done in the API route handlers using a custom `authorize` helper that checks the JWT claims.

### SLA Tracking & Breach Detection

- **SLA Rules** are defined per product, severity, and priority combination (e.g., `first_response` = 60 min, `resolution` = 480 min).
- When a complaint is created/assigned, deadlines are calculated and stored in `sla_first_response_deadline` and `sla_resolution_deadline`.
- A background job (cron) checks every minute for breached deadlines, updates dashboard metrics, and triggers `complaint.sla_breached` events.
- The `slaStatus` filter on the complaint list lets you view `breached`, `at_risk` (within 10% of deadline), or `compliant` tickets.

---

## Dashboards & Analytics

ResolveX provides five dashboard views:

1. **Staff Dashboard** – Assigned, completed, pending, reopened, escalated tickets; average resolution time; productivity score.
2. **Team Dashboard** – Total open, backlog, resolution rate, SLA compliance %, average load per member.
3. **Product Dashboard** – Complaint volume, category breakdown, top frequent issues, SLA violation rate, resolution trend.
4. **Executive Dashboard** – High‑level KPIs: total/open/resolved today, SLA breaches, avg resolution time, top teams and staff.
5. **Analytics Endpoints** – `GET /analytics/staff-performance`, `/team-performance`, `/product-performance` return aggregated lists for cross‑entity comparison.

All metrics support custom date ranges (`dateFrom` / `dateTo`) and are pre‑aggregated using database queries or materialized views for performance.

---

## Webhooks & Events

External services can subscribe to real‑time events via the Webhook API (`/api/v1/webhooks/subscriptions`). Four event types are available:

- `complaint.created`
- `complaint.assigned`
- `complaint.status_changed`
- `complaint.sla_breached`

Each webhook payload is signed with an HMAC‑SHA256 signature (header `X-ResolveX-Signature`) to verify authenticity. Subscriptions are managed by administrators with the `webhook:manage` permission.

---

## Security

- **Password hashing**: bcrypt with cost factor 12.
- **JWT**: Access tokens expire after 15 minutes; refresh tokens are rotated and revoked on logout.
- **Rate limiting**: Global 1000 req/min per user; stricter on auth endpoints (5 req/min per IP).
- **CORS**: Only allowed origins configured.
- **Input validation**: All API inputs are validated with Zod; file uploads check MIME type and size.
- **Audit**: Every state mutation is recorded in immutable audit logs.
- **HTTPS**: Enforced in production.

---

## Deployment

### Vercel (Recommended)

1. Push the repository to GitHub.
2. Import into Vercel.
3. Set all environment variables.
4. Add a `postinstall` script: `prisma generate && prisma migrate deploy`.
5. Deploy.

### Docker

A `Dockerfile` is provided:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Combine with a `docker-compose.yml` that includes PostgreSQL.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Ensure your code passes linting (`npm run lint`), formatting (`npm run format`), and unit tests (`npm run test`).

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
Made with ❤️ for efficient complaint resolution.
</div>