# Architecture Overview

> A deep dive into the ResolveX system architecture, design decisions, and component interactions.

---

## 1. System Architecture

ResolveX follows a **layered architecture** within the Next.js App Router, separating concerns into distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Layer                                │
│           Next.js Edge Network + Vercel Infrastructure           │
├─────────────────────────────────────────────────────────────────┤
│                        Proxy Layer                               │
│              Auth header injection (proxy.ts)                    │
├─────────────────────────────────────────────────────────────────┤
│                      Page Layer                                  │
│   ┌─────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ │
│   │ Complaints  │ │ Dashboard  │ │ Products │ │ Teams/Users   │ │
│   └─────────────┘ └────────────┘ └──────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     API Route Layer                              │
│   ┌──────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐ │
│   │ Auth │ │Complaints│ │Dashboard │ │Products│ │ Teams/etc  │ │
│   └──────┘ └──────────┘ └──────────┘ └────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Middleware Layer                               │
│   ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│   │  withLogging()      │  │  requirePermissions()           │  │
│   └─────────────────────┘  └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Service Layer                                │
│   ┌──────────────────────────┐  ┌──────────────────────────┐   │
│   │  Status Workflow Engine  │  │  Auto Assignment Engine  │   │
│   └──────────────────────────┘  └──────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Library Layer                               │
│   ┌─────┐ ┌────┐ ┌────────┐ ┌──────┐ ┌─────┐ ┌───────────┐   │
│   │Auth │ │JWT │ │ Logger │ │ RBAC │ │ Zod │ │ Response  │   │
│   └─────┘ └────┘ └────────┘ └──────┘ └─────┘ └───────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│              PostgreSQL 16 + Prisma 7 ORM                       │
│         Cloudinary (File Storage) + jose (JWT)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Flow

### 2.1 API Request Lifecycle

```
Client Request
      │
      ▼
┌─────────────────────┐
│  Next.js Edge       │  ─── Static assets, caching
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Vercel Proxy       │  ─── Injects x-user-id, x-user-email, x-user-roles headers
│  (proxy.ts)         │      (auth verification happens at the proxy level)
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Route Handler      │  ─── Matches /api/v1/{resource}/{id}/{action}
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Auth Check         │  ─── requirePermissions() / requireRoles()
│                     │      Extracts user from proxy-set headers
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Validation         │  ─── Zod schema validation
│  (validators/)      │      Returns 422 on failure
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Business Logic     │  ─── Prisma queries, service calls
│  (route handler)    │      Wrapped in logging middleware
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Response           │  ─── Standardized response helpers
│  (lib/response.ts)  │      { success, data?, error?, meta? }
└─────────────────────┘
```

### 2.2 Page Request Flow

```
Browser Request
      │
      ▼
┌─────────────────────┐
│  Root Layout        │  ─── app/layout.tsx: Theme, fonts, global styles
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Client Component   │  ─── "use client" page component
└─────────────────────┘
      │
      ├──→ useAuth() hook  ─── Checks localStorage for token
      │                       Fetches /api/v1/auth/me for profile
      │
      ├──→ Fetch data from API routes
      │       └── Tokens passed via Authorization header
      │
      └──→ Render UI based on permissions
              └── checkPermissions() / checkRoles()
```

---

## 3. Authentication Architecture

### 3.1 Token Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Client  │          │  Proxy   │          │  API     │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  POST /auth/login   │                     │
     │────────────────────>│                     │
     │                     │  Verify credentials │
     │                     │────────────────────>│
     │                     │  Generate tokens     │
     │                     │<────────────────────│
     │  { accessToken,     │                     │
     │    refreshToken }   │                     │
     │<────────────────────│                     │
     │                     │                     │
     │  Store tokens       │                     │
     │  in localStorage    │                     │
     │                     │                     │
     │  GET /complaints    │                     │
     │  Authorization:     │                     │
     │  Bearer <access>    │                     │
     │────────────────────>│                     │
     │                     │  Verify JWT         │
     │                     │  Set x-user-*       │
     │                     │  headers            │
     │                     │────────────────────>│
     │                     │  Extract user from  │
     │                     │  headers, process   │
     │                     │<────────────────────│
     │  Response           │                     │
     │<────────────────────│                     │
```

### 3.2 Token Details

- **Access Token**: JWT (HS256), 15-minute expiry
- **Refresh Token**: JWT (HS256), 7-day expiry, SHA-256 hashed before DB storage
- **Token storage**: localStorage (client-side)
- **Session persistence**: Optional "Remember Me" flag

---

## 4. API Route Organization

Every route follows a consistent pattern:

```
app/api/v1/
├── {resource}/
│   ├── route.ts              # List / Create (GET, POST)
│   └── [id]/
│       ├── route.ts          # Read / Update / Delete (GET, PUT, DELETE)
│       ├── {sub-resource}/
│       │   ├── route.ts      # List sub-resources (GET, POST)
│       │   └── [subId]/
│       │       └── route.ts  # Sub-resource operations
│       └── {action}/
│           └── route.ts      # Action endpoints (POST only)
```

### Route Handler Template

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // 1. Authorization
    const auth = await requirePermissions(request, Permissions.REQUIRED_PERM);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // 2. Extract path/query parameters
    const { id } = await params;

    // 3. Business logic
    const data = await prisma.model.findMany({ ... });

    // 4. Response
    return successResponse(data);
  } catch (error) {
    logger.error("Operation failed", ctx, error);
    return internalErrorResponse("Failed to process request");
  }
}
```

---

## 5. Key Design Decisions

### 5.1 Why Next.js App Router?

- **File-based routing** for both pages and API routes — keeps related code co-located
- **Server Components** for data-fetching pages (when applicable)
- **API Routes** co-located with page routes — no separate server needed
- **Edge-ready** for potential future edge function deployment

### 5.2 Why Prisma 7 with Adapter Pattern?

- **Type-safe database access** with generated TypeScript types
- **PrismaPg adapter** for optimal PostgreSQL connection pooling
- **Migration management** with version-controlled SQL
- **Studio** for ad-hoc database inspection during development

### 5.3 Why RBAC over simpler auth?

- **Granular permission control** — 40+ permissions across 5 roles
- **Frontend-backend consistent** — same permission constants in both layers
- **Future-proof** — new permissions can be added without schema changes
- **Audit-ready** — every action is authorized with traceable permission checks

### 5.4 Why Proxy-Level Auth?

- **Separation of concerns** — API routes don't handle JWT verification
- **Simplified route handlers** — just read x-user-* headers
- **Consistent auth** — all services behind the proxy share auth context
- **Future migration** — swap to a different auth provider without changing route code

---

## 6. Component Architecture

### 6.1 Page Components

Each page follows a hook-based data fetching pattern:

```
Page Component
  │
  ├── useAuth()  ──→ Auth state + profile
  │
  ├── checkPermissions() / checkRoles()  ──→ Permission checks (frontend)
  │
  ├── fetch() to API  ──→ Data fetching with tokens
  │
  └── Render UI based on permissions and data
```

### 6.2 Reusable Components

- **AppNavigation**: Fixed top navigation with role-aware sections
- **EditableField**: Inline-editable field wrapper
- **TransitionModal**: Status transition confirmation modal
- **DeleteConfirmModal**: Deletion confirmation modal
- **ParticleField**: Decorative particle animation background
- **StatusFlowDiagram**: Visual status workflow tracker
- **Dashboard Widgets**: ProductAnalyticsWidget, StaffMetricsWidget, TeamMetricsWidget

---

## 7. State Management

ResolveX uses **React hooks** and **local state** rather than a global state library:

- **useAuth()**: Authentication state (token, profile, permissions)
- **useState / useCallback**: Per-component data management
- **localStorage**: Token persistence
- **URL params**: Filters, pagination state (via searchParams)

For real-time updates, the comment section uses a **30-second polling interval** to detect new comments without WebSocket infrastructure.

---

## 8. Error Handling Strategy

### 8.1 API Errors

Standardized error responses with consistent structure:

| Status | Code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate / state conflict |
| 422 | `VALIDATION_ERROR` | Zod validation failed |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

### 8.2 Client-Side Error Handling

- API fetch calls wrapped in try/catch
- User-facing error messages in toast-like notification elements
- Network errors caught and displayed with retry options
- Authentication failures trigger redirect to login

---

## 9. Performance Considerations

- **Prisma query optimization**: Selective field selection, pagination, compound indexes
- **Async logging**: Non-blocking log writes with microtask scheduling
- **Parallel queries**: `Promise.all` for independent database queries
- **Duration tracking**: `performance.now()` with sub-millisecond precision
- **Comment polling**: 30-second interval with silent failures
- **Loading skeletons**: Skeleton UI during data fetch instead of spinners

---

## 10. Related Documentation

- [API Reference](./API.md) — Complete API endpoint documentation
- [RBAC Guide](./RBAC.md) — Role-based access control details
- [Database Schema](./DATABASE.md) — Data model and relationships
- [Complaint Workflow](./COMPLAINT_WORKFLOW.md) — State machine and transitions
- [Deployment Guide](./DEPLOYMENT.md) — Deploying to production
