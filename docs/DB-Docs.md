# ResolveX Complaint Management System

## Enterprise Database Design

---

# 1. USERS & AUTHENTICATION

## users

| Column            | Type         | Constraints  |
| ----------------- | ------------ | ------------ |
| id                | UUID         | PK           |
| employee_id       | VARCHAR(50)  | UNIQUE       |
| first_name        | VARCHAR(100) | NOT NULL     |
| last_name         | VARCHAR(100) | NOT NULL     |
| email             | VARCHAR(255) | UNIQUE       |
| phone             | VARCHAR(20)  | NULL         |
| password_hash     | TEXT         | NOT NULL     |
| profile_image_url | TEXT         | NULL         |
| is_active         | BOOLEAN      | DEFAULT TRUE |
| last_login_at     | TIMESTAMP    | NULL         |
| created_at        | TIMESTAMP    | NOT NULL     |
| updated_at        | TIMESTAMP    | NOT NULL     |

---

## roles

| Column      | Type |
| ----------- | ---- |
| id          | UUID |
| role_name   |      |
| description |      |
| created_at  |      |

Examples:

* CUSTOMER
* SUPPORT_AGENT
* TEAM_LEAD
* PRODUCT_MANAGER
* ADMIN

---

## permissions

| Column         | Type |
| -------------- | ---- |
| id             | UUID |
| permission_key |      |
| description    |      |

Examples:

* complaint.create
* complaint.update
* complaint.assign
* complaint.close
* product.manage

---

## role_permissions

| Column           |
| ---------------- |
| id               |
| role_id FK       |
| permission_id FK |

---

## user_roles

| Column     |
| ---------- |
| id         |
| user_id FK |
| role_id FK |

---

# 2. PRODUCT MANAGEMENT

## products

| Column         | Type         |
| -------------- | ------------ |
| id             | UUID         |
| product_code   | VARCHAR(50)  |
| product_name   | VARCHAR(255) |
| description    | TEXT         |
| category_id FK |              |
| owner_id FK    |              |
| status         |              |
| created_at     |              |
| updated_at     |              |

---

## product_categories

| Column      |
| ----------- |
| id          |
| name        |
| description |

Examples:

* Software
* Hardware
* Mobile App
* Web Platform

---

## product_sla_rules

| Column                  |
| ----------------------- |
| id                      |
| product_id FK           |
| priority                |
| response_time_minutes   |
| resolution_time_minutes |
| escalation_time_minutes |

---

# 3. TEAM MANAGEMENT

## teams

| Column        |
| ------------- |
| id            |
| team_code     |
| team_name     |
| description   |
| manager_id FK |
| created_at    |

Examples:

* Mobile Team
* Backend Team
* Infrastructure Team

---

## team_members

| Column     |
| ---------- |
| id         |
| team_id FK |
| user_id FK |
| joined_at  |

---

## product_team_mapping

Determines auto-routing.

| Column        |
| ------------- |
| id            |
| product_id FK |
| team_id FK    |
| priority      |
| is_default    |

---

# 4. COMPLAINT MANAGEMENT

## complaints

Main table.

| Column               |
| -------------------- |
| id                   |
| ticket_number        |
| title                |
| description          |
| customer_id FK       |
| product_id FK        |
| category_id FK       |
| priority             |
| severity             |
| current_status       |
| assigned_team_id FK  |
| assigned_agent_id FK |
| source               |
| resolution_summary   |
| created_at           |
| updated_at           |
| resolved_at          |
| closed_at            |

Status Values:

* OPEN
* ASSIGNED
* IN_PROGRESS
* WAITING_CUSTOMER
* RESOLVED
* REOPENED
* CLOSED
* ESCALATED

Priority:

* LOW
* MEDIUM
* HIGH
* CRITICAL

Severity:

* S1
* S2
* S3
* S4

---

## complaint_categories

| Column        |
| ------------- |
| id            |
| product_id FK |
| category_name |
| description   |

Examples:

* Login Issue
* Payment Failure
* Performance Issue
* Security Issue

---

# 5. ASSIGNMENT ENGINE

## complaint_assignments

Stores all assignment history.

| Column               |
| -------------------- |
| id                   |
| complaint_id FK      |
| assigned_team_id FK  |
| assigned_agent_id FK |
| assigned_by FK       |
| assignment_reason    |
| assigned_at          |

---

## assignment_rules

Auto-assignment logic.

| Column         |
| -------------- |
| id             |
| product_id FK  |
| category_id FK |
| priority       |
| team_id FK     |
| active         |

---

# 6. COMMENTS & COMMUNICATION

## complaint_comments

| Column          |
| --------------- |
| id              |
| complaint_id FK |
| user_id FK      |
| comment         |
| is_internal     |
| created_at      |

---

## complaint_attachments

| Column          |
| --------------- |
| id              |
| complaint_id FK |
| uploaded_by FK  |
| file_name       |
| file_type       |
| file_size       |
| storage_url     |
| uploaded_at     |

---

# 7. STATUS HISTORY

## complaint_status_history

Immutable timeline.

| Column          |
| --------------- |
| id              |
| complaint_id FK |
| old_status      |
| new_status      |
| changed_by FK   |
| remarks         |
| changed_at      |

---

# 8. SLA TRACKING

## complaint_sla_tracking

| Column                  |
| ----------------------- |
| id                      |
| complaint_id FK         |
| response_due_at         |
| resolution_due_at       |
| first_response_at       |
| resolved_at             |
| breached_response_sla   |
| breached_resolution_sla |

---

## sla_breach_logs

| Column          |
| --------------- |
| id              |
| complaint_id FK |
| sla_type        |
| breached_at     |
| action_taken    |

---

# 9. ESCALATION MANAGEMENT

## escalations

| Column            |
| ----------------- |
| id                |
| complaint_id FK   |
| escalation_level  |
| escalated_to_team |
| escalated_to_user |
| reason            |
| escalated_at      |

Levels:

* L1
* L2
* L3
* MANAGEMENT

---

# 10. AUDIT LOGGING

## audit_logs

Immutable table.

| Column           |
| ---------------- |
| id               |
| entity_type      |
| entity_id        |
| action           |
| old_values JSONB |
| new_values JSONB |
| performed_by     |
| ip_address       |
| user_agent       |
| created_at       |

Examples:

* CREATE_COMPLAINT
* UPDATE_COMPLAINT
* ASSIGN_TICKET
* CHANGE_STATUS
* CLOSE_TICKET

---

# 11. NOTIFICATIONS

## notifications

| Column     |
| ---------- |
| id         |
| user_id FK |
| title      |
| message    |
| type       |
| is_read    |
| created_at |

---

# 12. DASHBOARD ANALYTICS

## ticket_metrics_daily

Pre-aggregated analytics.

| Column              |
| ------------------- |
| id                  |
| metric_date         |
| total_created       |
| total_resolved      |
| total_closed        |
| total_reopened      |
| avg_resolution_time |

---

## staff_performance_metrics

| Column              |
| ------------------- |
| id                  |
| user_id FK          |
| assigned_tickets    |
| resolved_tickets    |
| pending_tickets     |
| avg_resolution_time |
| productivity_score  |
| calculated_at       |

---

## team_performance_metrics

| Column                    |
| ------------------------- |
| id                        |
| team_id FK                |
| assigned_tickets          |
| completed_tickets         |
| pending_tickets           |
| sla_compliance_percentage |
| avg_resolution_time       |

---

## product_complaint_metrics

| Column              |
| ------------------- |
| id                  |
| product_id FK       |
| complaint_count     |
| resolved_count      |
| open_count          |
| avg_resolution_time |

---

# 13. REFRESH TOKENS

## refresh_tokens

| Column     |
| ---------- |
| id         |
| user_id FK |
| token_hash |
| expires_at |
| revoked    |
| created_at |

---

# RELATIONSHIP SUMMARY

Users
├── UserRoles
├── TeamMembers
├── Complaints
├── Comments
├── Assignments
└── AuditLogs

Products
├── ProductCategories
├── ProductSLA
├── ProductTeamMapping
└── Complaints

Complaints
├── Assignments
├── Comments
├── Attachments
├── StatusHistory
├── SLATracking
├── Escalations
└── AuditLogs

Teams
├── TeamMembers
├── ProductMappings
├── Assignments
└── PerformanceMetrics

This schema is normalized (3NF), supports auto-assignment, SLA management, analytics dashboards, audit compliance, RBAC, and can scale to millions of tickets in PostgreSQL.
