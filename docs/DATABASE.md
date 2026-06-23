# Database Schema

> Complete reference for the ResolveX PostgreSQL database schema, covering all models, relationships, and indexes.

**Technology**: PostgreSQL 16 + Prisma 7 ORM

---

## 1. Entity Relationship Overview

```
┌───────────────┐     ┌───────────────────┐     ┌───────────────┐
│     User      │────→│     UserRole      │←────│     Role      │
└───────┬───────┘     └───────────────────┘     └───────┬───────┘
        │                                               │
        │                                               │
        │       ┌───────────────────┐                   │
        │       │  RolePermission   │←──────────────────┘
        │       └───────────────────┘
        │               │
        │               │
        ▼               ▼
┌───────────────┐     ┌───────────────────┐
│  Complaint    │────→│  Permission       │
│  (customer)   │     └───────────────────┘
└───────┬───────┘
        │
        ├──────────────────┬──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                  ▼
┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐
│   Comment    │  │  Attachment   │  │  Assignment  │  │   Timeline    │
└──────────────┘  └───────────────┘  └──────────────┘  └───────────────┘

┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐
│  Product     │  │ ProductTeam   │  │    Team      │  │  TeamMember   │
└──────┬───────┘  └───────────────┘  └──────┬───────┘  └───────────────┘
       │                                    │
       ▼                                    ▼
┌──────────────┐                    ┌───────────────┐
│ ProductCat.  │                    │  Performance  │
└──────────────┘                    │  Metrics      │
                                    └───────────────┘
```

---

## 2. Core Domain Models

### 2.1 User

The central identity model for both employees and customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `uuid()` | Unique identifier |
| `employeeId` | VARCHAR(50) | UNIQUE, NOT NULL | Employee/customer ID |
| `firstName` | VARCHAR(100) | NOT NULL | First name |
| `lastName` | VARCHAR(100) | NOT NULL | Last name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email address (login) |
| `phone` | VARCHAR(20) | NULLABLE | Phone number |
| `passwordHash` | TEXT | NOT NULL | bcrypt hash |
| `profileImageUrl` | TEXT | NULLABLE | Avatar URL |
| `status` | ENUM | `ACTIVE`, `INACTIVE`, `SUSPENDED` | Account status |
| `isActive` | BOOLEAN | default `true` | Active flag |
| `lastLoginAt` | TIMESTAMP | NULLABLE | Last login time |
| `deletedAt` | TIMESTAMP | NULLABLE | Soft delete |
| `createdAt` | TIMESTAMP | auto | Creation time |
| `updatedAt` | TIMESTAMP | auto | Last update |

**Indexes:** `email`, `employeeId`, `status`, `isActive`

**Relationships:**
- → `UserRole` (1:N) — Role assignments
- → `RefreshToken` (1:N) — Auth tokens
- → `Complaint` as customer (1:N) — Submitted complaints
- → `Complaint` as agent (1:N) — Assigned complaints
- → `Comment` (1:N) — Comments written
- → `Attachment` (1:N) — Files uploaded
- → `TeamMember` (1:N) — Team memberships
- → `StaffPerformanceMetric` (1:N) — Performance data

### 2.2 Complaint

The core entity — represents a support ticket/complaint.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `ticketNumber` | VARCHAR(20) | UNIQUE, NOT NULL | Human-readable ID (e.g., REQ-2024-0001) |
| `title` | VARCHAR(255) | NOT NULL | Brief title |
| `description` | TEXT | NOT NULL | Detailed description |
| `customerId` | UUID | FK → User | Creator |
| `productId` | UUID | FK → Product | Related product |
| `categoryId` | UUID | FK → ComplaintCategory | Issue category |
| `priority` | ENUM | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Priority level |
| `severity` | ENUM | `LOW`, `MEDIUM`, `HIGH`, `SEVERE` | Severity level |
| `currentStatus` | ENUM | See status enum | Current lifecycle stage |
| `assignedTeamId` | UUID | FK → Team, NULLABLE | Assigned team |
| `assignedAgentId` | UUID | FK → User, NULLABLE | Assigned agent |
| `source` | VARCHAR(50) | NULLABLE | Intake channel |
| `resolutionSummary` | TEXT | NULLABLE | Resolution notes |
| `slaFirstResponseDeadline` | TIMESTAMP | NULLABLE | SLA deadline |
| `slaResolutionDeadline` | TIMESTAMP | NULLABLE | SLA deadline |
| `deletedAt` | TIMESTAMP | NULLABLE | Soft delete |
| `resolvedAt` | TIMESTAMP | NULLABLE | Resolution time |
| `closedAt` | TIMESTAMP | NULLABLE | Closure time |

**Indexes:** `currentStatus`, `priority`, `severity`, `customerId`, `assignedAgentId`, `assignedTeamId`, `productId`, `categoryId`, `createdAt`, `ticketNumber`, and 6 composite indexes.

**Status Enum:**
```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                       ↕                    ↕
             WAITING_CUSTOMER           REOPENED
                              → ESCALATED
```

---

## 3. RBAC Models

### 3.1 Role

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | VARCHAR(50) | UNIQUE — `CUSTOMER`, `SUPPORT_AGENT`, `TEAM_LEAD`, `PRODUCT_MANAGER`, `ADMIN` |
| `description` | TEXT | NULLABLE |

### 3.2 Permission

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | UNIQUE — e.g., `complaint:create` |

### 3.3 UserRole (Join Table)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `userId` | UUID | FK → User (Restrict) |
| `roleId` | UUID | FK → Role (Restrict) |
| `createdAt` | TIMESTAMP | auto |

**Unique:** `[userId, roleId]`

### 3.4 RolePermission (Join Table)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `roleId` | UUID | FK → Role (Cascade) |
| `permissionId` | UUID | FK → Permission (Cascade) |

**Unique:** `[roleId, permissionId]`

---

## 4. Product Domain

### 4.1 ProductCategory

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | UNIQUE — e.g., "Software", "Hardware" |
| `description` | TEXT | NULLABLE |

Relationships:
- → `Product` (1:N)

### 4.2 Product

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `productCode` | VARCHAR(50) | UNIQUE |
| `productName` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | NULLABLE |
| `categoryId` | UUID | FK → ProductCategory |
| `ownerId` | UUID | FK → User (manager) |
| `status` | ENUM | `ACTIVE`, `DEPRECATED`, `DISABLED` |
| `deletedAt` | TIMESTAMP | Nullable |

### 4.3 ProductSLARule

SLA definitions per product, priority, and severity.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `productId` | UUID | FK → Product |
| `priority` | ENUM | ComplaintPriority |
| `severity` | ENUM | ComplaintSeverity |
| `responseTimeMinutes` | INT | Required |
| `resolutionTimeMinutes` | INT | Required |
| `escalationTimeMinutes` | INT | NULLABLE |

**Unique:** `[productId, priority, severity]`

### 4.4 ProductTeamMapping

Maps teams to products they support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `productId` | UUID | FK → Product |
| `teamId` | UUID | FK → Team |
| `isPrimary` | BOOLEAN | Default false |
| `loadWeight` | FLOAT | Default 1.0 — used by auto-assignment |

**Unique:** `[productId, teamId]`

---

## 5. Team Domain

### 5.1 Team

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `teamName` | VARCHAR(100) | UNIQUE |
| `description` | TEXT | NULLABLE |
| `managerId` | UUID | FK → User |
| `deletedAt` | TIMESTAMP | Nullable |

### 5.2 TeamMember

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `teamId` | UUID | FK → Team |
| `userId` | UUID | FK → User |
| `role` | ENUM | `LEAD`, `MEMBER` |
| `joinedAt` | TIMESTAMP | Auto |

**Unique:** `[teamId, userId]`

---

## 6. Operational Models

### 6.1 Comment

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `userId` | UUID | FK → User |
| `content` | TEXT | NOT NULL |
| `isInternal` | BOOLEAN | Default false — staff-only visibility |
| `isEdited` | BOOLEAN | Default false |
| `createdAt` | TIMESTAMP | Auto |
| `updatedAt` | TIMESTAMP | Auto |

### 6.2 Attachment

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `uploadedBy` | UUID | FK → User |
| `fileName` | VARCHAR(255) | Original filename |
| `fileType` | VARCHAR(100) | MIME type |
| `fileSize` | INT | Bytes |
| `storageUrl` | TEXT | Cloudinary URL |
| `storagePublicId` | TEXT | NULLABLE — Cloudinary public ID |

### 6.3 ComplaintTimeline

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `eventType` | ENUM | `STATUS_CHANGE`, `ASSIGNMENT`, `COMMENT`, `ESCALATION`, `RESOLUTION`, `ATTACHMENT`, `UPDATE` |
| `actorId` | UUID | User who performed the action |
| `eventData` | JSONB | NULLABLE — type-specific payload |
| `createdAt` | TIMESTAMP | Auto |

### 6.4 Assignment

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `assignedTeamId` | UUID | FK → Team (optional) |
| `assignedAgentId` | UUID | FK → User (optional) |
| `assignedBy` | ENUM | `SYSTEM`, `LEAD`, `ADMIN` |
| `assignmentReason` | VARCHAR(500) | NULLABLE |

### 6.5 SLATracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `responseDueAt` | TIMESTAMP | SLA deadline |
| `resolutionDueAt` | TIMESTAMP | SLA deadline |
| `firstResponseAt` | TIMESTAMP | NULLABLE |
| `resolvedAt` | TIMESTAMP | NULLABLE |
| `breachedResponseSla` | BOOLEAN | Default false |
| `breachedResolutionSla` | BOOLEAN | Default false |

### 6.6 Escalation

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `escalationLevel` | ENUM | `L1`, `L2`, `L3`, `MANAGEMENT` |
| `escalatedToTeam` | UUID | FK → Team (optional) |
| `escalatedToUser` | UUID | FK → User (optional) |
| `reason` | TEXT | NULLABLE |

### 6.7 ComplaintStatusHistory

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `oldStatus` | ENUM | Previous status |
| `newStatus` | ENUM | New status |
| `changedBy` | UUID | FK → User |
| `remarks` | VARCHAR(500) | NULLABLE |

---

## 7. Analytics Models

### 7.1 StaffPerformanceMetric

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `userId` | UUID | FK → User |
| `assignedTickets` | INT | Count assigned |
| `resolvedTickets` | INT | Count resolved |
| `pendingTickets` | INT | Count pending |
| `avgResolutionTime` | FLOAT | NULLABLE (hours) |
| `productivityScore` | FLOAT | NULLABLE |
| `calculatedAt` | TIMESTAMP | Auto |

### 7.2 TeamPerformanceMetric

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `teamId` | UUID | FK → Team |
| `assignedTickets` | INT | Count assigned |
| `completedTickets` | INT | Count completed |
| `pendingTickets` | INT | Count pending |
| `slaCompliancePercentage` | FLOAT | NULLABLE |
| `avgResolutionTime` | FLOAT | NULLABLE (hours) |

### 7.3 ProductComplaintMetric

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `productId` | UUID | FK → Product |
| `complaintCount` | INT | Total |
| `resolvedCount` | INT | Resolved |
| `openCount` | INT | Open |
| `avgResolutionTime` | FLOAT | NULLABLE (hours) |

### 7.4 TicketMetricsDaily

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `metricDate` | TIMESTAMP | UNIQUE |
| `totalCreated` | INT | Tickets created |
| `totalResolved` | INT | Tickets resolved |
| `totalClosed` | INT | Tickets closed |
| `totalReopened` | INT | Tickets reopened |
| `avgResolutionTime` | FLOAT | NULLABLE (hours) |

---

## 8. Audit & Security Models

### 8.1 RefreshToken

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `userId` | UUID | FK → User |
| `tokenHash` | TEXT | SHA-256 hash |
| `expiresAt` | TIMESTAMP | 7 days from creation |
| `revoked` | BOOLEAN | Default false |
| `createdAt` | TIMESTAMP | Auto |

### 8.2 AuditLog

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `entityType` | VARCHAR(50) | Resource type |
| `entityId` | UUID | Resource ID |
| `action` | VARCHAR(50) | Action performed |
| `oldValues` | JSONB | Previous state |
| `newValues` | JSONB | New state |
| `performedBy` | UUID | FK → User |
| `ipAddress` | VARCHAR(45) | Client IP |
| `userAgent` | TEXT | Browser/agent |

### 8.3 Notification

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `userId` | UUID | FK → User |
| `title` | VARCHAR(255) | Notification title |
| `message` | TEXT | Body |
| `type` | ENUM | `ASSIGNMENT`, `ESCALATION`, `RESOLUTION`, `COMMENT`, `SLA_BREACH` |
| `isRead` | BOOLEAN | Default false |
| `referenceId` | UUID | Related entity ID |

### 8.4 SlaBreachLog

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `complaintId` | UUID | FK → Complaint |
| `slaType` | ENUM | `FIRST_RESPONSE`, `RESOLUTION` |
| `breachedAt` | TIMESTAMP | Auto |
| `actionTaken` | TEXT | NULLABLE |

---

## 9. Assignment Rules

### 9.1 AssignmentRule

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `productId` | UUID | FK → Product |
| `categoryId` | UUID | FK → ComplaintCategory (optional) |
| `priority` | ENUM | ComplaintPriority |
| `teamId` | UUID | Target team |
| `isActive` | BOOLEAN | Default true |

---

## 10. Migration Management

Migrations are stored in `prisma/migrations/`:

```
prisma/migrations/
├── 20260619113122_add_comment_edit_fields/
│   └── migration.sql
├── 20260620051712_add_attachment_public_id/
│   └── migration.sql
├── 20260620051849_add_attachment_public_id/
│   └── migration.sql
├── 20260620200000_add_update_timeline_event_type/
│   └── migration.sql
└── migration_lock.toml
```

**Commands:**

```bash
# Create a new migration
npx prisma migrate dev --name add_field_name

# Apply migrations in production
npm run db:migrate:deploy

# Reset database (dev only — drops all data)
npm run db:reset

# Push schema without migration
npm run db:push
```

---

## 11. Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) — System architecture
- [Complaint Workflow](./COMPLAINT_WORKFLOW.md) — State machine
- [API Reference](./API.md) — Complete API documentation
