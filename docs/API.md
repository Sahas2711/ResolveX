# API Reference

> Complete documentation for all ResolveX REST API endpoints.

**Base URL**: `/api/v1`

**Authentication**: All endpoints except `/auth/login` and `/auth/register` require a valid JWT access token in the `Authorization` header: `Bearer <token>`

**Response Format**:

```json
// Success
{ "success": true, "data": { ... } }

// Paginated Success
{ "success": true, "data": [...], "meta": { "page": 1, "pageSize": 20, "totalItems": 100, "totalPages": 5 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Description", "details": [...] } }
```

---

## Table of Contents

- [Auth](#auth)
- [Complaints](#complaints)
- [Comments](#comments)
- [Attachments](#attachments)
- [Timeline](#timeline)
- [Products](#products)
- [Teams](#teams)
- [Users](#users)
- [Roles](#roles)
- [Dashboard](#dashboard)
- [Health](#health)

---

## Auth

### POST /api/v1/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "employeeId": "EMP-001"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

### POST /api/v1/auth/login

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." }
  }
}
```

### POST /api/v1/auth/logout

Invalidate the current refresh token.

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

### POST /api/v1/auth/refresh

Obtain a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "accessToken": "new-jwt...", "refreshToken": "new-jwt..." }
}
```

### GET /api/v1/auth/me

Get the current user's profile with resolved roles and permissions.

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "employeeId": "EMP-001",
    "isActive": true,
    "status": "ACTIVE",
    "profileImageUrl": null,
    "roles": ["SUPPORT_AGENT"],
    "permissions": ["complaint:read:all", "complaint:update", "complaint:comment", ...]
  }
}
```

---

## Complaints

### GET /api/v1/complaints

List complaints with pagination and filtering.

**Permission:** `complaint:read:all`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 100) |
| `search` | string | — | Search ticket number or title |
| `status` | string | `all` | Filter by status (open, assigned, in_progress, waiting_for_customer, resolved, closed, reopened, escalated) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "REQ-2024-0001",
      "title": "Login issue",
      "description": "Cannot access the dashboard",
      "customer": { "id": "uuid", "firstName": "John", "lastName": "Doe" },
      "product": { "id": "uuid", "name": "Web Platform" },
      "category": "Login Issue",
      "priority": "high",
      "severity": "major",
      "currentStatus": "open",
      "assignedTeam": null,
      "assignedStaff": null,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 42, "totalPages": 3 }
}
```

### POST /api/v1/complaints

Create a new complaint.

**Permission:** `complaint:create`

**Request Body:**
```json
{
  "title": "Cannot access the admin panel",
  "description": "Getting a 403 error when trying to access /admin",
  "productId": "uuid",
  "categoryId": "uuid",
  "priority": "high",
  "severity": "major"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { /* full complaint object */ }
}
```

### GET /api/v1/complaints/{complaintId}

Get a single complaint's full details.

**Permission:** `complaint:read:all`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticketNumber": "REQ-2024-0001",
    "title": "Cannot access the admin panel",
    "description": "Getting a 403 error when trying to access /admin",
    "customer": { "id": "uuid", "firstName": "John", "lastName": "Doe" },
    "product": { "id": "uuid", "name": "Web Platform" },
    "category": "Bug Report",
    "priority": "high",
    "severity": "major",
    "currentStatus": "assigned",
    "assignedTeam": { "id": "uuid", "name": "Web Support" },
    "assignedStaff": { "id": "uuid", "name": "Jane Smith" },
    "resolutionNotes": null,
    "slaFirstResponseDeadline": "2024-01-01T04:00:00Z",
    "slaResolutionDeadline": "2024-01-02T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T01:00:00Z",
    "closedAt": null
  }
}
```

### PUT /api/v1/complaints/{complaintId}

Update complaint fields (priority, severity, description, category).

**Permission:** `complaint:update`

**Request Body (partial):**
```json
{
  "priority": "critical",
  "severity": "critical"
}
```

**Response (200):** Updated complaint object

### POST /api/v1/complaints/{complaintId}/assign

Reassign a complaint to a team and/or agent.

**Permission:** `complaint:reassign`

**Request Body:**
```json
{
  "teamId": "uuid",
  "agentId": "uuid"
}
```

**Response (200):** Updated complaint with new assignment

### POST /api/v1/complaints/{complaintId}/status

Transition complaint status (start work, wait for customer, resume work).

**Permission:** `complaint:update:status`

**Request Body:**
```json
{
  "transitionId": "start",
  "remarks": "Beginning investigation"
}
```

**Valid transitions:**
| Current Status | transitionId | Next Status |
|---------------|--------------|-------------|
| assigned | start | in_progress |
| in_progress | wait | waiting_for_customer |
| waiting_for_customer | resume | in_progress |
| reopened | start | in_progress |
| escalated | start | in_progress |

### POST /api/v1/complaints/{complaintId}/resolve

Resolve a complaint with a resolution summary.

**Permission:** `complaint:resolve`

**Request Body:**
```json
{
  "resolutionSummary": "Fixed the permission issue by updating role assignments"
}
```

### POST /api/v1/complaints/{complaintId}/close

Close a resolved complaint.

**Permission:** `complaint:close`

**Request Body (optional):**
```json
{
  "closureNotes": "Customer confirmed the fix works"
}
```

### POST /api/v1/complaints/{complaintId}/reopen

Reopen a closed or resolved complaint.

**Permission:** `complaint:reopen`

**Request Body:**
```json
{
  "reason": "Issue has recurred after the fix"
}
```

### POST /api/v1/complaints/{complaintId}/escalate

Escalate a complaint to a higher level.

**Permission:** `complaint:escalate`

**Request Body:**
```json
{
  "reason": "Requires senior engineering review",
  "escalateToTeamId": "uuid",
  "escalateToUserId": "uuid"
}
```

---

## Comments

### GET /api/v1/complaints/{complaintId}/comments

List comments for a complaint.

**Permission:** `complaint:comment`

**Query Parameters:** `page`, `pageSize`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "complaintId": "uuid",
      "userId": "uuid",
      "userName": "Jane Smith",
      "content": "Investigating the issue now",
      "internal": false,
      "isEdited": false,
      "createdAt": "2024-01-01T01:00:00Z",
      "updatedAt": "2024-01-01T01:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```

### POST /api/v1/complaints/{complaintId}/comments

Add a comment to a complaint.

**Permission:** `complaint:comment`

**Request Body:**
```json
{
  "content": "I've identified the root cause",
  "internal": false
}
```

### PATCH /api/v1/complaints/{complaintId}/comments/{commentId}

Edit a comment. Only the comment author can edit.

**Permission:** `complaint:comment`

**Request Body:**
```json
{
  "content": "Updated investigation notes"
}
```

### DELETE /api/v1/complaints/{complaintId}/comments/{commentId}

Delete a comment. Only the comment author can delete.

**Permission:** `complaint:comment`

**Response (204):** No content

---

## Attachments

### GET /api/v1/complaints/{complaintId}/attachments

List attachments for a complaint.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "complaintId": "uuid",
      "fileName": "screenshot.png",
      "fileType": "image/png",
      "fileSize": 245760,
      "fileUrl": "https://res.cloudinary.com/...",
      "uploadedBy": "uuid",
      "uploadedByName": "Jane Smith",
      "createdAt": "2024-01-01T01:00:00Z"
    }
  ]
}
```

### POST /api/v1/complaints/{complaintId}/attachments

Upload a file attachment.

**Permission:** `complaint:attachment`

**Request:** `multipart/form-data`
- `file`: The file to upload (allowed: jpg, png, pdf, docx; max 10 MB)

### DELETE /api/v1/complaints/{complaintId}/attachments/{attachmentId}

Delete an attachment. Only the uploader or admin can delete.

**Permission:** `complaint:attachment`

**Response (204):** No content

---

## Timeline

### GET /api/v1/complaints/{complaintId}/timeline

Get the activity timeline for a complaint.

**Query Parameters:** `page`, `pageSize`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "eventType": "status_change",
      "actorId": "uuid",
      "actorName": "Jane Smith",
      "eventData": { "from": "OPEN", "to": "IN_PROGRESS" },
      "createdAt": "2024-01-01T01:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 50, "totalItems": 10, "totalPages": 1 }
}
```

**Event Types:**
| Type | Description | eventData |
|------|-------------|-----------|
| `status_change` | Status transition | `{ from, to }` |
| `assignment` | Team/agent assignment | `{ assignedTo, assignedTeam }` |
| `comment` | Comment added/deleted | `{ action, commentId }` |
| `escalation` | Complaint escalated | `{ reason, level }` |
| `resolution` | Complaint resolved | `{ resolution }` |
| `attachment` | Attachment added/deleted | `{ action, fileName }` |
| `update` | Field updated | `{ changes }` |

---

## Products

### GET /api/v1/products

List all products.

**Permission:** `product:read`

**Query Parameters:** `page`, `pageSize`, `search`, `status`

### POST /api/v1/products

Create a new product.

**Permission:** `product:create`

**Request Body:**
```json
{
  "productName": "Web Platform v2",
  "productCode": "WEB-V2",
  "description": "Next-generation web platform",
  "categoryId": "uuid"
}
```

### GET /api/v1/products/{productId}

Get product details.

**Permission:** `product:read`

### PUT /api/v1/products/{productId}

Update a product.

**Permission:** `product:update`

### DELETE /api/v1/products/{productId}

Soft-delete a product.

**Permission:** `product:delete`

### GET /api/v1/products/{productId}/teams

List teams mapped to a product.

### POST /api/v1/products/{productId}/teams

Map a team to a product.

**Request Body:**
```json
{
  "teamId": "uuid",
  "isPrimary": true,
  "loadWeight": 1.0
}
```

### DELETE /api/v1/products/{productId}/teams

Remove a team mapping.

**Request Body:** `{ "teamId": "uuid" }`

---

## Teams

### GET /api/v1/teams

List all teams.

**Permission:** `team:read`

### POST /api/v1/teams

Create a new team.

**Permission:** `team:create`

**Request Body:**
```json
{
  "teamName": "Web Support Team",
  "description": "Handles web platform complaints",
  "managerId": "uuid"
}
```

### GET /api/v1/teams/{teamId}

Get team details with members.

**Permission:** `team:read`

### PUT /api/v1/teams/{teamId}

Update a team.

**Permission:** `team:update`

### DELETE /api/v1/teams/{teamId}

Soft-delete a team.

**Permission:** `team:delete`

### GET /api/v1/teams/{teamId}/members

List team members.

### POST /api/v1/teams/{teamId}/members

Add a member to the team.

**Permission:** `team:member:add`

**Request Body:**
```json
{
  "userId": "uuid",
  "role": "MEMBER"
}
```

### DELETE /api/v1/teams/{teamId}/members

Remove a member from the team.

**Permission:** `team:member:remove`

**Request Body:** `{ "userId": "uuid" }`

---

## Users

### GET /api/v1/users

List all users (admin only).

**Permission:** `user:read`

### GET /api/v1/users/{userId}

Get user details.

**Permission:** `user:read`

### PUT /api/v1/users/{userId}

Update user information.

**Permission:** `user:update`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "isActive": true
}
```

### DELETE /api/v1/users/{userId}

Soft-delete a user.

**Permission:** `user:delete`

### POST /api/v1/users/{userId}/roles

Assign roles to a user.

**Permission:** `user:manage`

**Request Body:**
```json
{
  "roleIds": ["uuid1", "uuid2"]
}
```

### DELETE /api/v1/users/{userId}/roles

Revoke a role from a user.

**Permission:** `user:manage`

**Request Body:** `{ "roleIds": ["uuid1"] }`

---

## Roles

### GET /api/v1/roles

List all roles with their associated permissions.

**Permission:** `role:read`

---

## Dashboard

### GET /api/v1/dashboard/overview

Executive dashboard KPIs.

**Permission:** `dashboard:executive`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalComplaints": 150,
    "openComplaints": 23,
    "resolvedToday": 5,
    "avgResolutionTime": 4.5,
    "slaComplianceRate": 94.2,
    "trendData": [
      { "period": "2024-01", "created": 45, "resolved": 38 }
    ]
  }
}
```

### GET /api/v1/dashboard/product/{productId}

Product-specific analytics.

**Permission:** `dashboard:product`

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "uuid",
    "productName": "Web Platform",
    "totalComplaints": 75,
    "categoryBreakdown": { "Login Issue": 20, "Bug Report": 35 },
    "frequentIssues": [{ "issue": "Login timeout", "count": 15 }],
    "slaViolationRate": 5.3,
    "resolutionTrend": [{ "period": "2024-01", "count": 18 }]
  }
}
```

### GET /api/v1/dashboard/team/{teamId}

Team performance metrics.

**Permission:** `dashboard:team`

### GET /api/v1/dashboard/staff/{staffId}

Individual staff performance.

**Permission:** `dashboard:staff`

### GET /api/v1/dashboard

Unified dashboard view (role-aware aggregation).

---

## Health

### GET /api/v1/health

Health check endpoint (no auth required).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "uptime": 12345
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Malformed request or invalid parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource conflict (duplicate, invalid state) |
| `VALIDATION_ERROR` | 422 | Request body failed schema validation |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
