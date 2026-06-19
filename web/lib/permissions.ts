// =============================================================================
// Permission & Role Constants
// Single source of truth for all RBAC keys. Prevents magic strings.
// Mirrors the seed data in prisma/seed.ts
// =============================================================================

// ── Permissions ────────────────────────────────────────────────────────────

export const Permissions = {
  // Complaints
  COMPLAINT_CREATE: "complaint:create",
  COMPLAINT_READ_OWN: "complaint:read:own",
  COMPLAINT_READ_ALL: "complaint:read:all",
  COMPLAINT_UPDATE: "complaint:update",
  COMPLAINT_UPDATE_STATUS: "complaint:update:status",
  COMPLAINT_REASSIGN: "complaint:reassign",
  COMPLAINT_ESCALATE: "complaint:escalate",
  COMPLAINT_RESOLVE: "complaint:resolve",
  COMPLAINT_CLOSE: "complaint:close",
  COMPLAINT_REOPEN: "complaint:reopen",
  COMPLAINT_COMMENT: "complaint:comment",

  // Products
  PRODUCT_CREATE: "product:create",
  PRODUCT_READ: "product:read",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_DELETE: "product:delete",

  // Teams
  TEAM_CREATE: "team:create",
  TEAM_READ: "team:read",
  TEAM_UPDATE: "team:update",
  TEAM_DELETE: "team:delete",
  TEAM_MEMBER_ADD: "team:member:add",
  TEAM_MEMBER_REMOVE: "team:member:remove",

  // Dashboards
  DASHBOARD_STAFF: "dashboard:staff",
  DASHBOARD_TEAM: "dashboard:team",
  DASHBOARD_PRODUCT: "dashboard:product",
  DASHBOARD_EXECUTIVE: "dashboard:executive",

  // Users & Roles
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_MANAGE: "user:manage",
  ROLE_READ: "role:read",
  ROLE_CREATE: "role:create",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  PERMISSION_READ: "permission:read",
  PERMISSION_CREATE: "permission:create",

  // Audit & System
  AUDIT_READ: "audit:read",
  SYSTEM_SETTINGS: "system:settings",

  // Webhooks
  WEBHOOK_MANAGE: "webhook:manage",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// ── Roles ──────────────────────────────────────────────────────────────────

export const Roles = {
  CUSTOMER: "CUSTOMER",
  SUPPORT_AGENT: "SUPPORT_AGENT",
  TEAM_LEAD: "TEAM_LEAD",
  PRODUCT_MANAGER: "PRODUCT_MANAGER",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];

// ── Role → Permissions mapping (mirrors seed.ts) ──────────────────────────

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [Roles.CUSTOMER]: [
    Permissions.COMPLAINT_CREATE,
    Permissions.COMPLAINT_READ_OWN,
    Permissions.COMPLAINT_COMMENT,
  ],

  [Roles.SUPPORT_AGENT]: [
    Permissions.COMPLAINT_READ_ALL,
    Permissions.COMPLAINT_UPDATE,
    Permissions.COMPLAINT_UPDATE_STATUS,
    Permissions.COMPLAINT_RESOLVE,
    Permissions.COMPLAINT_COMMENT,
    Permissions.DASHBOARD_STAFF,
  ],

  [Roles.TEAM_LEAD]: [
    Permissions.COMPLAINT_READ_ALL,
    Permissions.COMPLAINT_UPDATE,
    Permissions.COMPLAINT_UPDATE_STATUS,
    Permissions.COMPLAINT_REASSIGN,
    Permissions.COMPLAINT_ESCALATE,
    Permissions.COMPLAINT_RESOLVE,
    Permissions.COMPLAINT_CLOSE,
    Permissions.COMPLAINT_REOPEN,
    Permissions.COMPLAINT_COMMENT,
    Permissions.DASHBOARD_STAFF,
    Permissions.DASHBOARD_TEAM,
    Permissions.TEAM_READ,
  ],

  [Roles.PRODUCT_MANAGER]: [
    Permissions.COMPLAINT_READ_ALL,
    Permissions.COMPLAINT_COMMENT,
    Permissions.PRODUCT_CREATE,
    Permissions.PRODUCT_READ,
    Permissions.PRODUCT_UPDATE,
    Permissions.PRODUCT_DELETE,
    Permissions.TEAM_READ,
    Permissions.DASHBOARD_PRODUCT,
  ],

  [Roles.ADMIN]: [
    Permissions.COMPLAINT_CREATE,
    Permissions.COMPLAINT_READ_OWN,
    Permissions.COMPLAINT_READ_ALL,
    Permissions.COMPLAINT_UPDATE,
    Permissions.COMPLAINT_UPDATE_STATUS,
    Permissions.COMPLAINT_REASSIGN,
    Permissions.COMPLAINT_ESCALATE,
    Permissions.COMPLAINT_RESOLVE,
    Permissions.COMPLAINT_CLOSE,
    Permissions.COMPLAINT_REOPEN,
    Permissions.COMPLAINT_COMMENT,
    Permissions.PRODUCT_CREATE,
    Permissions.PRODUCT_READ,
    Permissions.PRODUCT_UPDATE,
    Permissions.PRODUCT_DELETE,
    Permissions.TEAM_CREATE,
    Permissions.TEAM_READ,
    Permissions.TEAM_UPDATE,
    Permissions.TEAM_DELETE,
    Permissions.TEAM_MEMBER_ADD,
    Permissions.TEAM_MEMBER_REMOVE,
    Permissions.DASHBOARD_STAFF,
    Permissions.DASHBOARD_TEAM,
    Permissions.DASHBOARD_PRODUCT,
    Permissions.DASHBOARD_EXECUTIVE,
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
    Permissions.USER_MANAGE,
    Permissions.ROLE_READ,
    Permissions.ROLE_CREATE,
    Permissions.ROLE_UPDATE,
    Permissions.ROLE_DELETE,
    Permissions.PERMISSION_READ,
    Permissions.PERMISSION_CREATE,
    Permissions.AUDIT_READ,
    Permissions.SYSTEM_SETTINGS,
    Permissions.WEBHOOK_MANAGE,
  ],
};
