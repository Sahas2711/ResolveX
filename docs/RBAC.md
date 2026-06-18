# Role-Based Access Control (RBAC)

## Overview

ResolveX uses a Role-Based Access Control (RBAC) model to secure resources and enforce least-privilege access across the platform.

Each user is assigned one or more roles. Every role contains a collection of permissions (scopes). A user's effective permissions are the union of permissions granted through all assigned roles.

The RBAC system ensures that users can only perform actions required for their responsibilities.

---

# Access Hierarchy

```text
ADMIN
│
├── PRODUCT_MANAGER
│
├── TEAM_LEAD
│
├── SUPPORT_AGENT
│
└── CUSTOMER
```

Higher-level roles generally have broader access, but permissions are enforced explicitly through scopes rather than inheritance.

---

# Roles

## CUSTOMER

Customers are end users who submit complaints and track their own tickets.

### Responsibilities

* Create complaints
* View own complaints
* View complaint timeline
* Upload attachments
* Add comments
* Reopen resolved complaints (if allowed)
* Receive notifications

### Accessible Modules

* Authentication
* Complaint Management (Own Tickets Only)
* Notifications

### Restrictions

Customers cannot:

* View other users' complaints
* Assign complaints
* Resolve complaints
* Access dashboards
* Manage products
* Manage teams
* Manage users

---

## SUPPORT_AGENT

Support agents handle complaints assigned to them.

### Responsibilities

* Manage assigned complaints
* Update complaint status
* Add internal notes
* Upload supporting attachments
* Resolve complaints

### Accessible Modules

* Authentication
* Complaint Management
* Timeline
* Notifications

### Restrictions

Support agents cannot:

* Manage products
* Manage teams
* Manage users
* Assign complaints to other agents
* Access executive analytics

---

## TEAM_LEAD

Team leads manage support teams and oversee ticket distribution.

### Responsibilities

* Monitor team workload
* Reassign complaints
* Escalate complaints
* Review team performance
* Manage ticket distribution

### Accessible Modules

* Complaint Management
* Team Dashboard
* Team Workload
* Assignment Management

### Restrictions

Team leads cannot:

* Manage system users
* Manage roles
* Manage products
* Access system configuration

---

## PRODUCT_MANAGER

Product managers oversee product-related complaints and analytics.

### Responsibilities

* Manage products
* Manage SLA policies
* Configure product-team mappings
* Analyze product complaint trends
* Review complaint categories

### Accessible Modules

* Product Management
* Product Analytics
* SLA Management
* Complaint Reporting

### Restrictions

Product managers cannot:

* Manage users
* Manage system roles
* Access global system settings

---

## ADMIN

Administrators have unrestricted access across the platform.

### Responsibilities

* User management
* Role management
* Permission management
* Team management
* Product management
* System configuration
* Dashboard access
* Audit log access
* Webhook management

### Accessible Modules

All modules.

---

# Permission Scopes

## Authentication

| Permission   | Description        |
| ------------ | ------------------ |
| auth:login   | Login to system    |
| auth:logout  | Logout from system |
| auth:refresh | Refresh JWT token  |

---

## Complaint Permissions

| Permission              | Description             |
| ----------------------- | ----------------------- |
| complaint:create        | Create complaint        |
| complaint:read:own      | View own complaints     |
| complaint:read:all      | View all complaints     |
| complaint:update        | Update complaint        |
| complaint:update:status | Change complaint status |
| complaint:comment       | Add comments            |
| complaint:attachment    | Upload attachments      |
| complaint:resolve       | Resolve complaints      |
| complaint:close         | Close complaints        |
| complaint:reopen        | Reopen complaints       |
| complaint:reassign      | Reassign complaints     |
| complaint:escalate      | Escalate complaints     |

---

## Product Permissions

| Permission     | Description     |
| -------------- | --------------- |
| product:create | Create products |
| product:read   | View products   |
| product:update | Update products |
| product:delete | Delete products |

---

## Team Permissions

| Permission         | Description         |
| ------------------ | ------------------- |
| team:create        | Create teams        |
| team:read          | View teams          |
| team:update        | Update teams        |
| team:delete        | Delete teams        |
| team:member:add    | Add team members    |
| team:member:remove | Remove team members |

---

## User Permissions

| Permission       | Description  |
| ---------------- | ------------ |
| user:create      | Create users |
| user:read        | View users   |
| user:update      | Update users |
| user:delete      | Delete users |
| user:role:assign | Assign roles |

---

## Dashboard Permissions

| Permission          | Description                 |
| ------------------- | --------------------------- |
| dashboard:staff     | Staff performance dashboard |
| dashboard:team      | Team performance dashboard  |
| dashboard:product   | Product analytics dashboard |
| dashboard:executive | Executive dashboard         |

---

## Audit Permissions

| Permission | Description     |
| ---------- | --------------- |
| audit:read | View audit logs |

---

## Notification Permissions

| Permission          | Description                |
| ------------------- | -------------------------- |
| notification:read   | View notifications         |
| notification:update | Mark notifications as read |

---

## System Permissions

| Permission      | Description            |
| --------------- | ---------------------- |
| settings:read   | View system settings   |
| settings:update | Update system settings |

---

## Webhook Permissions

| Permission     | Description                  |
| -------------- | ---------------------------- |
| webhook:manage | Manage webhook subscriptions |

---

# Role-Permission Matrix

| Permission              | Customer | Agent | Team Lead | Product Manager | Admin |
| ----------------------- | -------- | ----- | --------- | --------------- | ----- |
| complaint:create        | ✅        | ❌     | ❌         | ❌               | ✅     |
| complaint:read:own      | ✅        | ✅     | ✅         | ✅               | ✅     |
| complaint:read:all      | ❌        | ✅     | ✅         | ✅               | ✅     |
| complaint:update        | ❌        | ✅     | ✅         | ✅               | ✅     |
| complaint:update:status | ❌        | ✅     | ✅         | ✅               | ✅     |
| complaint:comment       | ✅        | ✅     | ✅         | ✅               | ✅     |
| complaint:attachment    | ✅        | ✅     | ✅         | ✅               | ✅     |
| complaint:resolve       | ❌        | ✅     | ✅         | ✅               | ✅     |
| complaint:close         | ❌        | ✅     | ✅         | ✅               | ✅     |
| complaint:reopen        | ✅        | ✅     | ✅         | ✅               | ✅     |
| complaint:reassign      | ❌        | ❌     | ✅         | ❌               | ✅     |
| complaint:escalate      | ❌        | ❌     | ✅         | ❌               | ✅     |
| product:create          | ❌        | ❌     | ❌         | ✅               | ✅     |
| product:update          | ❌        | ❌     | ❌         | ✅               | ✅     |
| product:delete          | ❌        | ❌     | ❌         | ✅               | ✅     |
| team:create             | ❌        | ❌     | ❌         | ❌               | ✅     |
| team:update             | ❌        | ❌     | ✅         | ❌               | ✅     |
| user:create             | ❌        | ❌     | ❌         | ❌               | ✅     |
| user:update             | ❌        | ❌     | ❌         | ❌               | ✅     |
| user:delete             | ❌        | ❌     | ❌         | ❌               | ✅     |
| user:role:assign        | ❌        | ❌     | ❌         | ❌               | ✅     |
| dashboard:staff         | ❌        | ✅     | ✅         | ✅               | ✅     |
| dashboard:team          | ❌        | ❌     | ✅         | ✅               | ✅     |
| dashboard:product       | ❌        | ❌     | ❌         | ✅               | ✅     |
| dashboard:executive     | ❌        | ❌     | ❌         | ❌               | ✅     |
| audit:read              | ❌        | ❌     | ✅         | ✅               | ✅     |
| settings:update         | ❌        | ❌     | ❌         | ❌               | ✅     |
| webhook:manage          | ❌        | ❌     | ❌         | ❌               | ✅     |

---

# Authorization Flow

```text
User Login
      │
      ▼
JWT Generated
      │
      ▼
Middleware Validation
      │
      ▼
Extract Roles & Permissions
      │
      ▼
Permission Check
      │
      ├── Authorized → Continue
      │
      └── Unauthorized → 403 Forbidden
```

---

# Security Principles

ResolveX RBAC implementation follows:

1. Principle of Least Privilege
2. Explicit Permission Assignment
3. Deny by Default
4. Audit Logging for Sensitive Actions
5. JWT-Based Stateless Authorization
6. Role Aggregation Support
7. Separation of Duties
8. Multi-Role User Support

Every sensitive action must be validated through permission checks before execution.
