# Role-Based Access Control (RBAC)

> Comprehensive guide to ResolveX's permission system, roles, and how authorization works throughout the application.

---

## 1. Overview

ResolveX implements a **fine-grained RBAC system** with:
- **5 predefined roles** with escalating privileges
- **40+ granular permissions** covering every resource and action
- **Server-side enforcement** — every API route checks permissions
- **Client-side hooks** — UI adapts to the user's permissions
- **Database-backed** — roles and permissions stored in PostgreSQL

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Proxy Layer                            │
│  JWT verification happens here. Sets x-user-* headers         │
│  x-user-id, x-user-email, x-user-roles                       │
└─────────────────────┬────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                     API Route Layer                            │
│  requirePermissions(request, Permissions.COMPLAINT_CREATE)    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  1. getUserFromRequest(request)                          │ │
│  │     → Reads x-user-id, x-user-email, x-user-roles        │ │
│  │  2. getUserPermissions(userId)                           │ │
│  │     → Queries user → roles → permissions                 │ │
│  │  3. Compare required vs. user permissions                │ │
│  │  4. Return 403 or proceed                                │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Roles

### Customer

**Scope:** Can only interact with their own complaints.

```typescript
{
  name: "CUSTOMER",
  description: "End-user who submits complaints",
  permissions: [
    "complaint:create",       // Create new complaints
    "complaint:read:own",     // View own complaints
    "complaint:comment",      // Add comments to own complaints
    "complaint:attachment",   // Upload files to own complaints
  ]
}
```

### Support Agent

**Scope:** Full access to all complaints for triage and resolution.

```typescript
{
  name: "SUPPORT_AGENT",
  description: "Support staff handling complaints",
  permissions: [
    // All Customer permissions (except create & read:own)
    "complaint:read:all",       // View any complaint
    "complaint:update",         // Edit complaint fields
    "complaint:update:status",  // Change status
    "complaint:resolve",        // Submit resolution
    "complaint:comment",
    "complaint:attachment",
    "dashboard:staff",          // View personal dashboard
  ]
}
```

### Team Lead

**Scope:** Team oversight with reassignment and escalation privileges.

```typescript
{
  name: "TEAM_LEAD",
  description: "Team lead with oversight and reassignment privileges",
  permissions: [
    // All Support Agent permissions
    "complaint:reassign",     // Reassign to different team/agent
    "complaint:escalate",     // Escalate to higher level
    "complaint:close",        // Close resolved complaints
    "complaint:reopen",       // Reopen closed/resolved
    "dashboard:team",         // View team dashboard
    "team:read",              // View team data
  ]
}
```

### Product Manager

**Scope:** Product configuration and analytics.

```typescript
{
  name: "PRODUCT_MANAGER",
  description: "Product owner managing product configuration",
  permissions: [
    "complaint:read:all",
    "complaint:comment",
    "complaint:attachment",
    "product:create",
    "product:read",
    "product:update",
    "product:delete",
    "team:read",
    "dashboard:product",      // View product analytics
  ]
}
```

### Admin

**Scope:** Full system access — everything.

```typescript
{
  name: "ADMIN",
  description: "System administrator with full access",
  permissions: [
    // All permissions from every role
    "complaint:*",            // All complaint permissions
    "product:*",              // All product permissions
    "team:*",                 // All team permissions
    "dashboard:*",            // All dashboard permissions
    "user:*",                 // All user permissions
    "role:*",                 // All role permissions
    "permission:*",           // All permission management
    "audit:read",             // View audit logs
    "system:settings",        // Manage system settings
    "webhook:manage",         // Manage webhook subscriptions
  ]
}
```

> **Note:** The actual permission strings use the format shown in the code (e.g., `"complaint:create"`, `"user:manage"`). The `*` wildcards above are for illustration only.

---

## 4. Permission Reference

### Complaint Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `COMPLAINT_CREATE` | `complaint:create` | Submit new complaints |
| `COMPLAINT_READ_OWN` | `complaint:read:own` | View own complaints |
| `COMPLAINT_READ_ALL` | `complaint:read:all` | View any complaint |
| `COMPLAINT_UPDATE` | `complaint:update` | Edit complaint fields |
| `COMPLAINT_UPDATE_STATUS` | `complaint:update:status` | Change status |
| `COMPLAINT_REASSIGN` | `complaint:reassign` | Reassign complaints |
| `COMPLAINT_ESCALATE` | `complaint:escalate` | Escalate complaints |
| `COMPLAINT_RESOLVE` | `complaint:resolve` | Submit resolution |
| `COMPLAINT_CLOSE` | `complaint:close` | Close complaints |
| `COMPLAINT_REOPEN` | `complaint:reopen` | Reopen complaints |
| `COMPLAINT_COMMENT` | `complaint:comment` | Add comments |
| `COMPLAINT_ATTACHMENT` | `complaint:attachment` | Upload attachments |

### Product Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `PRODUCT_CREATE` | `product:create` | Create products |
| `PRODUCT_READ` | `product:read` | View product data |
| `PRODUCT_UPDATE` | `product:update` | Update products |
| `PRODUCT_DELETE` | `product:delete` | Delete products |

### Team Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `TEAM_CREATE` | `team:create` | Create teams |
| `TEAM_READ` | `team:read` | View team data |
| `TEAM_UPDATE` | `team:update` | Update teams |
| `TEAM_DELETE` | `team:delete` | Delete teams |
| `TEAM_MEMBER_ADD` | `team:member:add` | Add team members |
| `TEAM_MEMBER_REMOVE` | `team:member:remove` | Remove team members |

### Dashboard Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `DASHBOARD_STAFF` | `dashboard:staff` | Staff dashboard |
| `DASHBOARD_TEAM` | `dashboard:team` | Team dashboard |
| `DASHBOARD_PRODUCT` | `dashboard:product` | Product dashboard |
| `DASHBOARD_EXECUTIVE` | `dashboard:executive` | Executive dashboard |

### User & Role Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `USER_READ` | `user:read` | View user data |
| `USER_UPDATE` | `user:update` | Update users |
| `USER_DELETE` | `user:delete` | Delete users |
| `USER_MANAGE` | `user:manage` | Manage user roles |
| `ROLE_READ` | `role:read` | View roles |
| `ROLE_CREATE` | `role:create` | Create roles |
| `ROLE_UPDATE` | `role:update` | Update roles |
| `ROLE_DELETE` | `role:delete` | Delete roles |
| `PERMISSION_READ` | `permission:read` | View permissions |
| `PERMISSION_CREATE` | `permission:create` | Create permissions |

### Audit & System Permissions

| Constant | String | Description |
|----------|--------|-------------|
| `AUDIT_READ` | `audit:read` | View audit logs |
| `SYSTEM_SETTINGS` | `system:settings` | Manage system settings |
| `WEBHOOK_MANAGE` | `webhook:manage` | Manage webhooks |

---

## 5. Usage Guide

### 5.1 Server-Side: Protecting API Routes

```typescript
import { requirePermissions } from "@/lib/rbac";
import { Permissions } from "@/lib/permissions";

export async function POST(request: Request) {
  // Check that the user has ALL required permissions
  const auth = await requirePermissions(
    request,
    Permissions.COMPLAINT_CREATE,
    Permissions.COMPLAINT_ATTACHMENT,
  );

  // If not allowed, return the 403 response
  if (!auth.allowed) return auth.response;

  // Safe to proceed — user has all required permissions
  const { userId } = auth.user;
  // ... business logic
}
```

### 5.2 Server-Side: Role-Based Checks

```typescript
import { requireRoles } from "@/lib/rbac";

// Check that the user has at least ONE of the specified roles
const auth = await requireRoles(request, "TEAM_LEAD", "ADMIN");
if (!auth.allowed) return auth.response;
```

### 5.3 Server-Side: Combined Checks

```typescript
import { authorize } from "@/lib/rbac";

const auth = await authorize(request, {
  permissions: [Permissions.COMPLAINT_CLOSE],
  roles: ["TEAM_LEAD", "ADMIN"],
});
if (!auth.allowed) return auth.response;
```

### 5.4 Client-Side: Permission Checks

```tsx
import { useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

function MyComponent() {
  const auth = useAuth();

  // Check permissions using the existing auth state
  const { allowed: canCreate } = checkPermissions(auth, [
    Permissions.COMPLAINT_CREATE,
  ]);

  return (
    <div>
      {canCreate && <button>New Complaint</button>}
    </div>
  );
}
```

### 5.5 Client-Side: Permission Hook

```tsx
import { usePermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

function MyComponent() {
  const { allowed, isLoading } = usePermissions([
    Permissions.COMPLAINT_CREATE,
  ]);

  if (isLoading) return <div>Loading...</div>;
  return allowed ? <CreateButton /> : null;
}
```

### 5.6 Client-Side: Role Checks

```tsx
import { useRoles } from "@/hooks/useAuth";

function AdminPanel() {
  const { hasRole } = useRoles(["ADMIN"]);
  if (!hasRole) return null;
  return <AdminControls />;
}
```

---

## 6. Database Schema

The RBAC system is backed by four tables:

```sql
-- Users (from the users table)
users: id, employee_id, email, ...

-- Roles
roles: id, name (unique), description

-- Permissions
permissions: id, name (unique), description

-- Many-to-many relationships
user_roles: user_id, role_id
role_permissions: role_id, permission_id
```

When checking permissions:
1. Look up all roles assigned to the user via `user_roles`
2. For each role, look up all permissions via `role_permissions`
3. Collect into a unique set
4. Compare against the required permissions

---

## 7. Extending the RBAC System

### Adding a New Permission

1. Add the permission constant in `lib/permissions.ts`:

```typescript
export const Permissions = {
  // ...
  ANALYTICS_EXPORT: "analytics:export",
} as const;
```

2. Seed the permission in `prisma/seed.ts`:

```typescript
const permissionData = [
  // ...
  { name: "analytics:export", description: "Export analytics data" },
];
```

3. Assign the permission to desired roles in `ROLE_PERMISSIONS` map

4. Run `npm run db:seed` to update the database

5. Use in routes: `requirePermissions(request, Permissions.ANALYTICS_EXPORT)`

### Adding a New Role

1. Add the role constant:

```typescript
export const Roles = {
  // ...
  AUDITOR: "AUDITOR",
} as const;
```

2. Define permissions in `ROLE_PERMISSIONS`:

```typescript
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  // ...
  [Roles.AUDITOR]: [
    Permissions.COMPLAINT_READ_ALL,
    Permissions.AUDIT_READ,
  ],
};
```

3. Seed the role with permissions in `prisma/seed.ts`

4. Run `npm run db:seed`

---

## 8. Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) — System architecture
- [API Reference](./API.md) — Complete API documentation
- [Database Schema](./DATABASE.md) — Data model details
