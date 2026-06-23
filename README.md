<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/demo/image/upload/v1/RESOLVE-X/logo-dark">
  <img alt="ResolveX" src="https://res.cloudinary.com/demo/image/upload/v1/RESOLVE-X/logo-light">
</picture>

# ResolveX — Enterprise Complaint Management System

> **A modern, full-featured complaint lifecycle management platform built with Next.js 16, React 19, Prisma 7, and PostgreSQL.**

ResolveX streamlines the entire complaint journey — from submission through triage, assignment, investigation, resolution, and closure — with enterprise-grade RBAC, automated SLA tracking, real-time timelines, team management, and actionable analytics dashboards.

---

## ✨ Features

### 🎫 Complaint Lifecycle
- **Full lifecycle management** — Open → Assigned → In Progress → Resolved → Closed, with support for waiting, reopening, and escalation
- **Automatic ticket numbering** with configurable format
- **Priority & severity classification** (Low / Medium / High / Critical)
- **Category-based organization** with product-specific categories
- **SLA deadline tracking** for first response and resolution
- **Status workflow engine** enforcing valid state transitions

### 👤 Role-Based Access Control (RBAC)
- **5 built-in roles**: Customer, Support Agent, Team Lead, Product Manager, Admin
- **40+ granular permissions** covering complaints, products, teams, users, dashboards, and system settings
- **Permission-based API gating** — every route checks authorization
- **Frontend permission hooks** for conditional UI rendering
- **Role assignment & management** via admin UI

### 💬 Collaboration
- **Threaded comments** with internal/staff-only visibility
- **Full comment editing & deletion** by author
- **Real-time comment polling** for live updates
- **File attachments** with drag-and-drop upload to Cloudinary
- **Auto-generated activity timeline** for full audit trail

### 📊 Analytics Dashboards
- **Executive overview** — system-wide KPIs, trends, and SLA compliance
- **Product analytics** — complaint volume, category breakdown, frequent issues, resolution trends
- **Team performance** — workload distribution, resolution rates, SLA adherence
- **Staff metrics** — individual agent productivity and resolution times

### 👥 Team Management
- **Multi-team support** with product-to-team mappings
- **Team member roles** (Lead / Member) with distinct permissions
- **Automatic load-based assignment** engine
- **Primary team designation** per product

### 🔐 Security
- **JWT-based authentication** with access + refresh token rotation
- **SHA-256 hashed refresh tokens** stored in database
- **Password hashing** with bcrypt (cost factor 12)
- **Proxy-level auth header injection** for API route isolation
- **Security headers** via Vercel config (HSTS, X-Frame-Options, etc.)

### 📝 Audit & Logging
- **Enterprise structured logging** with structured JSON in production
- **Async buffered log writes** (non-blocking, microtask-flushed)
- **Request correlation IDs** for end-to-end tracing
- **Duration tracking** for performance monitoring
- **Request logging middleware** for API routes

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Language** | TypeScript 5.9 |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) |
| **Auth** | JWT via `jose` + bcrypt |
| **File Storage** | Cloudinary |
| **Validation** | Zod 4 |
| **Deployment** | Vercel |
| **Package Manager** | npm |

---

## 📁 Project Structure

```
web/
├── app/                          # Next.js App Router
│   ├── api/v1/                   # REST API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── complaints/           # Complaint CRUD & workflows
│   │   ├── dashboard/            # Analytics & metrics
│   │   ├── products/             # Product management
│   │   ├── teams/                # Team management
│   │   ├── users/                # User management
│   │   ├── roles/                # Role management
│   │   └── health/               # Health check
│   ├── complaints/               # Complaint pages
│   ├── dashboard/                # Dashboard pages
│   ├── products/                 # Product pages
│   ├── teams/                    # Team pages
│   ├── users/                    # User pages
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   └── layout.tsx                # Root layout
├── components/                   # Reusable UI components
│   ├── auth/                     # Auth layout components
│   ├── dashboard/                # Dashboard widgets
│   ├── AppNavigation.tsx         # Main navigation bar
│   └── ThemeProvider.tsx         # Theme context provider
├── hooks/                        # React hooks
│   └── useAuth.ts                # Auth state & permission hooks
├── lib/                          # Core libraries & utilities
│   ├── auth.ts                   # JWT & password utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── rbac.ts                   # Role-based access control
│   ├── permissions.ts            # Permission & role constants
│   ├── response.ts               # Standardized API response helpers
│   ├── logger.ts                 # Enterprise structured logger
│   ├── log-middleware.ts         # Request logging middleware
│   ├── cloudinary.ts             # Cloudinary upload service
│   └── validators/               # Zod validation schemas
├── services/                     # Business logic services
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Data model definition
│   ├── migrations/               # Migration history
│   ├── seed.ts                   # Database seeder
│   └── index.ts                  # Prisma client re-export
├── docs/                         # Documentation
├── prisma.config.ts              # Prisma v7 configuration
├── proxy.ts                      # Auth proxy header injection
└── vercel.json                   # Vercel deployment config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **PostgreSQL** >= 16
- **npm** >= 10.x
- **Cloudinary account** (for file uploads)

### 1. Clone & Install

```bash
git clone <repository-url>
cd web
npm install
```

### 2. Environment Variables

Create a `.env` file in the `web/` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/resolvex?schema=public"

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET="your-access-token-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-token-secret-min-32-chars"

# Cloudinary (optional — for file attachments)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_PATH="/RESOLVE-X"

# Optional
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Note:** The `prisma.config.ts` file automatically loads `.env` variables before Prisma CLI commands. No additional dotenv setup needed.

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:deploy

# Seed the database (creates admin user, roles, permissions, categories)
npm run db:seed
```

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials

After seeding, you can log in with:

| Email | Password | Role |
|-------|----------|------|
| `admin@resolvex.com` | `Admin@123` | ADMIN |

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (includes TypeScript check) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run dev migrations |
| `npm run db:migrate:deploy` | Run production migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (GUI database browser) |
| `npm run db:reset` | Reset database (drop all + migrate + seed) |
| `npm run db:push` | Push schema to database without migration |

---

## 🔌 API Overview

All API routes are prefixed with `/api/v1/`. Responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "totalItems": 100, "totalPages": 5 }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email", "constraint": "email" }]
  }
}
```

### Resource Endpoints

| Resource | Base Path | Key Operations |
|----------|-----------|----------------|
| **Auth** | `/auth` | Login, register, logout, refresh, me |
| **Complaints** | `/complaints` | CRUD, assign, status, resolve, close, reopen, escalate |
| **Comments** | `/complaints/{id}/comments` | Add, edit, delete, list |
| **Attachments** | `/complaints/{id}/attachments` | Upload, delete, list |
| **Timeline** | `/complaints/{id}/timeline` | Activity timeline |
| **Products** | `/products` | CRUD, team mappings |
| **Teams** | `/teams` | CRUD, member management |
| **Users** | `/users` | CRUD, role assignment |
| **Roles** | `/roles` | List roles |
| **Dashboard** | `/dashboard` | Overview, product, staff, team analytics |

> 📖 **Full API reference** — See [docs/API.md](./docs/API.md)

---

## 🏛 Architecture

ResolveX follows a **layered architecture** within the Next.js App Router:

```
┌─────────────────────────────────────────────────────────┐
│                      Page Layer                          │
│      (React Server/Client Components + Hooks)           │
├─────────────────────────────────────────────────────────┤
│                     API Route Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Auth     │  │ Complaints│  │ Products │  │Teams   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
├──────────────┬──────────────────────────────────────────┤
│ Middleware   │  Proxy (auth header injection)           │
│              │  Request logging (withLogging wrapper)   │
├──────────────┴──────────────────────────────────────────┤
│                   Service Layer                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Status Workflow  │  │ Auto-Assignment Engine      │  │
│  └─────────────────┘  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Library Layer                          │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌──────────┐  │
│  │ Auth │ │ RBAC │ │ Logger │ │ Zod   │ │Prisma    │  │
│  └──────┘ └──────┘ └────────┘ └───────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                           │
│            PostgreSQL + Prisma ORM                      │
└─────────────────────────────────────────────────────────┘
```

> 📖 **Detailed architecture** — See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🔒 Role-Based Access Control

Five roles with progressive permission sets:

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **CUSTOMER** | Own complaints | Create, read own, comment, attach files |
| **SUPPORT_AGENT** | All complaints | Read all, update status, resolve, comment |
| **TEAM_LEAD** | Team oversight | Reassign, escalate, close, reopen, team dashboards |
| **PRODUCT_MANAGER** | Product config | Manage products, read teams, product analytics |
| **ADMIN** | Full system | All permissions including user/role management |

> 📖 **RBAC details** — See [docs/RBAC.md](./docs/RBAC.md)

---

## 🔄 Complaint Workflow

The complaint lifecycle follows a state machine with valid transitions:

```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                     ↕                  ↕
           WAITING_FOR_CUSTOMER     REOPENED
                          
All states → ESCALATED (end state is contextual)
```

Each status transition:
- Validates permissions
- Enforces business rules (e.g., resolution notes required to resolve)
- Logs to the activity timeline
- Updates SLA tracking
- Sends notifications

> 📖 **Workflow details** — See [docs/COMPLAINT_WORKFLOW.md](./docs/COMPLAINT_WORKFLOW.md)

---

## 🗄 Database

PostgreSQL 16 with Prisma 7 ORM. Key models:

- **User** — Employees and customers with authentication
- **Role / Permission / UserRole / RolePermission** — RBAC system
- **Product / ProductCategory** — Product catalog
- **Team / TeamMember** — Team structure
- **Complaint** — Core complaint entity with full lifecycle tracking
- **Comment / Attachment** — Collaboration features
- **ComplaintTimeline** — Activity audit trail
- **Assignment / Escalation / SLATracking** — Operational tracking
- **StaffPerformanceMetric / TeamPerformanceMetric / ProductComplaintMetric** — Analytics

> 📖 **Full schema** — See [docs/DATABASE.md](./docs/DATABASE.md)

---

## ☁️ Deployment

Deployed on **Vercel** with the following configuration:

- **Build command**: `prisma generate && npm run build`
- **Framework**: Next.js (auto-detected)
- **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

> 📖 **Deployment guide** — See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 🧪 Testing

```bash
# TypeScript type check
npx tsc --noEmit

# Build check (includes TypeScript compilation)
npm run build

# Lint
npm run lint
```

---

## 📚 Documentation

All documentation is in the `docs/` directory:

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture deep dive |
| [API.md](./docs/API.md) | Complete API reference |
| [RBAC.md](./docs/RBAC.md) | Role-based access control guide |
| [DATABASE.md](./docs/DATABASE.md) | Database schema & relationships |
| [COMPLAINT_WORKFLOW.md](./docs/COMPLAINT_WORKFLOW.md) | Complaint lifecycle & state machine |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel deployment guide |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/), [React](https://react.dev/), [Prisma](https://www.prisma.io/), [Tailwind CSS](https://tailwindcss.com/)
- File storage powered by [Cloudinary](https://cloudinary.com/)
- Deployed on [Vercel](https://vercel.com/)
