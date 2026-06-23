# Complaint Workflow

> Complete reference for the complaint lifecycle, status state machine, valid transitions, and business rules.

---

## 1. State Machine

The complaint lifecycle is modeled as a **deterministic state machine** with strict transition rules.

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
    ┌────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌────────┐
    │  OPEN  │→ │ ASSIGNED │→ │IN_PROGRESS │→ │ RESOLVED │→ │ CLOSED │
    └────────┘  └──────────┘  └────────────┘  └──────────┘  └────────┘
                                 │     │            │            │
                                 │     │            │            │
                                 ▼     │            ▼            │
                          ┌───────────┐│   ┌──────────┐         │
                          │  WAITING  ││   │ REOPENED │◄────────┘
                          │_FOR_      ││   └──────────┘
                          │_CUSTOMER  ││         │
                          └───────────┘│         │
                                       │         │
                                       ▼         │
                                ┌────────────┐   │
                                │ ESCALATED  │   │
                                └────────────┘   │
                                       │         │
                                       └─────────┘
```

**Key Properties:**
- Each complaint is always in exactly one status
- Transitions are unidirectional (no going backward, except reopen)
- Escalation is available from most statuses
- Once **CLOSED**, a complaint can only be **REOPENED**

---

## 2. Status Definitions

| Status | Code | Description |
|--------|------|-------------|
| **OPEN** | `open` | Newly created, awaiting assignment |
| **ASSIGNED** | `assigned` | Team/agent assigned, work not started |
| **IN_PROGRESS** | `in_progress` | Active investigation/resolution |
| **WAITING_FOR_CUSTOMER** | `waiting_for_customer` | Awaiting customer response |
| **RESOLVED** | `resolved` | Solution provided, pending closure |
| **CLOSED** | `closed` | Fully resolved and closed |
| **REOPENED** | `reopened` | Previously closed, issue recurred |
| **ESCALATED** | `escalated` | Raised to higher authority |

---

## 3. Valid Transitions

### 3.1 From OPEN

| Action | Target Status | Permission | Remarks Required |
|--------|---------------|------------|-----------------|
| (Assignment) | ASSIGNED | `complaint:reassign` | — |

> **Note**: OPEN → ASSIGNED happens automatically when a team/agent is assigned. No manual status transition exists for this — assignment triggers the status change.

### 3.2 From ASSIGNED

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `start` | Start Work | IN_PROGRESS | `complaint:update:status` | No |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.3 From IN_PROGRESS

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `wait` | Wait for Customer | WAITING_FOR_CUSTOMER | `complaint:update:status` | Yes — info needed |
| `resolve` | Resolve | RESOLVED | `complaint:resolve` | Yes — resolution summary |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.4 From WAITING_FOR_CUSTOMER

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `resume` | Resume Work | IN_PROGRESS | `complaint:update:status` | No |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.5 From RESOLVED

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `close` | Close | CLOSED | `complaint:close` | No (optional notes) |
| `reopen` | Reopen | REOPENED | `complaint:reopen` | Yes — reason |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.6 From CLOSED

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `reopen` | Reopen | REOPENED | `complaint:reopen` | Yes — reason |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.7 From REOPENED

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `start` | Resume Work | IN_PROGRESS | `complaint:update:status` | No |
| `escalate` | Escalate | ESCALATED | `complaint:escalate` | Yes — reason |

### 3.8 From ESCALATED

| Transition ID | Action | Target Status | Permission | Remarks Required |
|---------------|--------|---------------|------------|-----------------|
| `start` | Resume Work | IN_PROGRESS | `complaint:update:status` | Yes — resolution notes |

---

## 4. API Endpoints

Each transition is triggered by a POST to a dedicated endpoint.

### 4.1 Status Change

```
POST /api/v1/complaints/{complaintId}/status
```

Used for: `start`, `wait`, `resume` transitions

```json
{
  "transitionId": "start",
  "remarks": "Beginning investigation (optional)"
}
```

### 4.2 Resolve

```
POST /api/v1/complaints/{complaintId}/resolve
```

```json
{
  "resolutionSummary": "Fixed the permission issue by updating the ACL configuration"
}
```

### 4.3 Close

```
POST /api/v1/complaints/{complaintId}/close
```

```json
{
  "closureNotes": "Customer confirmed the fix in production"
}
```

### 4.4 Reopen

```
POST /api/v1/complaints/{complaintId}/reopen
```

```json
{
  "reason": "Issue has recurred after deployment"
}
```

### 4.5 Escalate

```
POST /api/v1/complaints/{complaintId}/escalate
```

```json
{
  "reason": "Requires senior engineering review",
  "escalateToTeamId": "uuid",
  "escalateToUserId": "uuid"
}
```

---

## 5. Side Effects

Every status transition triggers these automatic side effects:

### 5.1 Timeline Event

A `ComplaintTimeline` record is created with:
- `eventType`: The type of transition
- `actorId`: Who performed the action
- `eventData`: Status-specific payload (old/new status, reason, etc.)

### 5.2 Status History

A `ComplaintStatusHistory` record stores the full transition:
- `oldStatus`: Previous status
- `newStatus`: New status
- `changedBy`: User who performed the transition
- `remarks`: Any notes provided

### 5.3 SLA Tracking

- **First response**: Tracked when the first status change from `OPEN` occurs
- **Resolution**: Recorded when status changes to `RESOLVED`
- **Breach detection**: SLA breaches are logged in `SlaBreachLog`

### 5.4 Assignment (if applicable)

On status change to `ASSIGNED`:
- Creates an `Assignment` record
- Updates `assignedTeamId` and `assignedAgentId` on the complaint

### 5.5 Timestamps

- `resolvedAt`: Set when status changes to `RESOLVED`
- `closedAt`: Set when status changes to `CLOSED`

---

## 6. Business Rules

### 6.1 Permission Enforcement

Each transition requires a specific permission:

```typescript
function canPerformTransition(t: UITransition, permissions: string[]): boolean {
  switch (t.endpoint) {
    case "/status":    return permissions.includes("complaint:update:status");
    case "/resolve":   return permissions.includes("complaint:resolve");
    case "/close":     return permissions.includes("complaint:close");
    case "/reopen":    return permissions.includes("complaint:reopen");
    case "/escalate":  return permissions.includes("complaint:escalate");
    default:           return false;
  }
}
```

### 6.2 Validation Rules

| Transition | Validation |
|------------|------------|
| `resolve` | Resolution summary is required (max 2000 chars) |
| `close` | Complaint must be in `RESOLVED` status |
| `reopen` | Reason is required (max 500 chars) |
| `escalate` | Reason is required (max 500 chars) |
| `wait` | Information needed field is required (max 500 chars) |

### 6.3 Status Transition Validation

The API validates that:
1. The requested transition is valid for the current status
2. The user has the required permission
3. All required fields are provided
4. Field length constraints are met

---

## 7. UI Workflow

The frontend provides an interactive workflow interface:

### 7.1 Status Flow Diagram

The main complaint detail page displays:
- A visual flow diagram showing all possible status paths
- The current status highlighted with glow effects
- Past statuses shown with checkmarks
- Future statuses dimmed

### 7.2 Action Buttons

Available transitions are shown as action buttons below the flow diagram:
- Each button checks the user's permissions
- Buttons are only shown if the user can perform the action
- Clicking opens a transition modal

### 7.3 Transition Modal

A modal dialog captures:
- Any required remarks/notes
- Character count for fields with limits
- Submit button with loading state
- Error display for failed transitions
- Success feedback on completion

---

## 8. Escalation Levels

The escalation system supports multiple levels:

| Level | Code | Description |
|-------|------|-------------|
| L1 | `L1` | First-level escalation (team lead) |
| L2 | `L2` | Second-level (department manager) |
| L3 | `L3` | Third-level (senior management) |
| MANAGEMENT | `MANAGEMENT` | Executive escalation |

---

## 9. Related Documentation

- [Architecture Overview](./ARCHITECTURE.md) — System architecture
- [API Reference](./API.md) — Complete API documentation
- [Database Schema](./DATABASE.md) — Data model details
- [RBAC Guide](./RBAC.md) — Permission and role details
