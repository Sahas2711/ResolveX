-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'SEVERE');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'ESCALATION', 'RESOLUTION', 'COMMENT', 'SLA_BREACH');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('SYSTEM', 'LEAD', 'ADMIN');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('L1', 'L2', 'L3', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('STATUS_CHANGE', 'ASSIGNMENT', 'COMMENT', 'ESCALATION', 'RESOLUTION', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "SlaType" AS ENUM ('FIRST_RESPONSE', 'RESOLUTION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "passwordHash" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "productCode" VARCHAR(50) NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "categoryId" UUID,
    "ownerId" UUID,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_sla_rules" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "priority" "ComplaintPriority" NOT NULL,
    "severity" "ComplaintSeverity" NOT NULL,
    "responseTimeMinutes" INTEGER NOT NULL,
    "resolutionTimeMinutes" INTEGER NOT NULL,
    "escalationTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "product_sla_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "teamName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "managerId" UUID,
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_team_mappings" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "loadWeight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_team_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "productId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "ticketNumber" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "priority" "ComplaintPriority" NOT NULL,
    "severity" "ComplaintSeverity" NOT NULL,
    "currentStatus" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTeamId" UUID,
    "assignedAgentId" UUID,
    "source" VARCHAR(50),
    "resolutionSummary" TEXT,
    "slaFirstResponseDeadline" TIMESTAMP(6),
    "slaResolutionDeadline" TIMESTAMP(6),
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "resolvedAt" TIMESTAMP(6),
    "closedAt" TIMESTAMP(6),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_comments" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "complaint_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_assignments" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "assignedTeamId" UUID,
    "assignedAgentId" UUID,
    "assignedBy" "AssignmentSource" NOT NULL,
    "assignmentReason" VARCHAR(500),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_sla_tracking" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "responseDueAt" TIMESTAMP(6) NOT NULL,
    "resolutionDueAt" TIMESTAMP(6) NOT NULL,
    "firstResponseAt" TIMESTAMP(6),
    "resolvedAt" TIMESTAMP(6),
    "breachedResponseSla" BOOLEAN NOT NULL DEFAULT false,
    "breachedResolutionSla" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "complaint_sla_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "escalationLevel" "EscalationLevel" NOT NULL,
    "escalatedToTeam" UUID,
    "escalatedToUser" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_status_history" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "oldStatus" "ComplaintStatus" NOT NULL,
    "newStatus" "ComplaintStatus" NOT NULL,
    "changedBy" UUID NOT NULL,
    "remarks" VARCHAR(500),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_timeline" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "actorId" UUID NOT NULL,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "complaint_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_rules" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "categoryId" UUID,
    "priority" "ComplaintPriority" NOT NULL,
    "teamId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "assignment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "performedBy" UUID NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_breach_logs" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "slaType" "SlaType" NOT NULL,
    "breachedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sla_breach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_metrics_daily" (
    "id" UUID NOT NULL,
    "metricDate" TIMESTAMP(6) NOT NULL,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalResolved" INTEGER NOT NULL DEFAULT 0,
    "totalClosed" INTEGER NOT NULL DEFAULT 0,
    "totalReopened" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" REAL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ticket_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_performance_metrics" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedTickets" INTEGER NOT NULL DEFAULT 0,
    "resolvedTickets" INTEGER NOT NULL DEFAULT 0,
    "pendingTickets" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" REAL,
    "productivityScore" REAL,
    "calculatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "staff_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_performance_metrics" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "assignedTickets" INTEGER NOT NULL DEFAULT 0,
    "completedTickets" INTEGER NOT NULL DEFAULT 0,
    "pendingTickets" INTEGER NOT NULL DEFAULT 0,
    "slaCompliancePercentage" REAL,
    "avgResolutionTime" REAL,
    "calculatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "team_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_complaint_metrics" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "complaintCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" REAL,
    "calculatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "product_complaint_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_employeeId_idx" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE INDEX "product_categories_name_idx" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "product_sla_rules_productId_idx" ON "product_sla_rules"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_sla_rules_productId_priority_severity_key" ON "product_sla_rules"("productId", "priority", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "teams_teamName_key" ON "teams"("teamName");

-- CreateIndex
CREATE INDEX "teams_teamName_idx" ON "teams"("teamName");

-- CreateIndex
CREATE INDEX "teams_managerId_idx" ON "teams"("managerId");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "product_team_mappings_productId_idx" ON "product_team_mappings"("productId");

-- CreateIndex
CREATE INDEX "product_team_mappings_teamId_idx" ON "product_team_mappings"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "product_team_mappings_productId_teamId_key" ON "product_team_mappings"("productId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_categories_name_key" ON "complaint_categories"("name");

-- CreateIndex
CREATE INDEX "complaint_categories_productId_idx" ON "complaint_categories"("productId");

-- CreateIndex
CREATE INDEX "complaint_categories_name_idx" ON "complaint_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_ticketNumber_key" ON "complaints"("ticketNumber");

-- CreateIndex
CREATE INDEX "complaints_currentStatus_idx" ON "complaints"("currentStatus");

-- CreateIndex
CREATE INDEX "complaints_priority_idx" ON "complaints"("priority");

-- CreateIndex
CREATE INDEX "complaints_severity_idx" ON "complaints"("severity");

-- CreateIndex
CREATE INDEX "complaints_customerId_idx" ON "complaints"("customerId");

-- CreateIndex
CREATE INDEX "complaints_assignedAgentId_idx" ON "complaints"("assignedAgentId");

-- CreateIndex
CREATE INDEX "complaints_assignedTeamId_idx" ON "complaints"("assignedTeamId");

-- CreateIndex
CREATE INDEX "complaints_productId_idx" ON "complaints"("productId");

-- CreateIndex
CREATE INDEX "complaints_categoryId_idx" ON "complaints"("categoryId");

-- CreateIndex
CREATE INDEX "complaints_createdAt_idx" ON "complaints"("createdAt");

-- CreateIndex
CREATE INDEX "complaints_currentStatus_priority_idx" ON "complaints"("currentStatus", "priority");

-- CreateIndex
CREATE INDEX "complaints_assignedTeamId_currentStatus_idx" ON "complaints"("assignedTeamId", "currentStatus");

-- CreateIndex
CREATE INDEX "complaints_productId_currentStatus_idx" ON "complaints"("productId", "currentStatus");

-- CreateIndex
CREATE INDEX "complaints_customerId_createdAt_idx" ON "complaints"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "complaints_assignedAgentId_currentStatus_idx" ON "complaints"("assignedAgentId", "currentStatus");

-- CreateIndex
CREATE INDEX "complaints_ticketNumber_idx" ON "complaints"("ticketNumber");

-- CreateIndex
CREATE INDEX "complaint_comments_complaintId_idx" ON "complaint_comments"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_comments_userId_idx" ON "complaint_comments"("userId");

-- CreateIndex
CREATE INDEX "complaint_comments_createdAt_idx" ON "complaint_comments"("createdAt");

-- CreateIndex
CREATE INDEX "complaint_attachments_complaintId_idx" ON "complaint_attachments"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_attachments_uploadedBy_idx" ON "complaint_attachments"("uploadedBy");

-- CreateIndex
CREATE INDEX "complaint_assignments_complaintId_idx" ON "complaint_assignments"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_assignments_assignedTeamId_idx" ON "complaint_assignments"("assignedTeamId");

-- CreateIndex
CREATE INDEX "complaint_assignments_assignedAgentId_idx" ON "complaint_assignments"("assignedAgentId");

-- CreateIndex
CREATE INDEX "complaint_assignments_createdAt_idx" ON "complaint_assignments"("createdAt");

-- CreateIndex
CREATE INDEX "complaint_sla_tracking_complaintId_idx" ON "complaint_sla_tracking"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_sla_tracking_breachedResponseSla_idx" ON "complaint_sla_tracking"("breachedResponseSla");

-- CreateIndex
CREATE INDEX "complaint_sla_tracking_breachedResolutionSla_idx" ON "complaint_sla_tracking"("breachedResolutionSla");

-- CreateIndex
CREATE INDEX "complaint_sla_tracking_responseDueAt_idx" ON "complaint_sla_tracking"("responseDueAt");

-- CreateIndex
CREATE INDEX "complaint_sla_tracking_resolutionDueAt_idx" ON "complaint_sla_tracking"("resolutionDueAt");

-- CreateIndex
CREATE INDEX "escalations_complaintId_idx" ON "escalations"("complaintId");

-- CreateIndex
CREATE INDEX "escalations_escalationLevel_idx" ON "escalations"("escalationLevel");

-- CreateIndex
CREATE INDEX "complaint_status_history_complaintId_idx" ON "complaint_status_history"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_status_history_changedBy_idx" ON "complaint_status_history"("changedBy");

-- CreateIndex
CREATE INDEX "complaint_status_history_createdAt_idx" ON "complaint_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "complaint_timeline_complaintId_idx" ON "complaint_timeline"("complaintId");

-- CreateIndex
CREATE INDEX "complaint_timeline_eventType_idx" ON "complaint_timeline"("eventType");

-- CreateIndex
CREATE INDEX "complaint_timeline_createdAt_idx" ON "complaint_timeline"("createdAt");

-- CreateIndex
CREATE INDEX "assignment_rules_productId_idx" ON "assignment_rules"("productId");

-- CreateIndex
CREATE INDEX "assignment_rules_teamId_idx" ON "assignment_rules"("teamId");

-- CreateIndex
CREATE INDEX "assignment_rules_priority_idx" ON "assignment_rules"("priority");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_performedBy_idx" ON "audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "sla_breach_logs_complaintId_idx" ON "sla_breach_logs"("complaintId");

-- CreateIndex
CREATE INDEX "sla_breach_logs_slaType_idx" ON "sla_breach_logs"("slaType");

-- CreateIndex
CREATE INDEX "ticket_metrics_daily_metricDate_idx" ON "ticket_metrics_daily"("metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_metrics_daily_metricDate_key" ON "ticket_metrics_daily"("metricDate");

-- CreateIndex
CREATE INDEX "staff_performance_metrics_userId_idx" ON "staff_performance_metrics"("userId");

-- CreateIndex
CREATE INDEX "staff_performance_metrics_calculatedAt_idx" ON "staff_performance_metrics"("calculatedAt");

-- CreateIndex
CREATE INDEX "team_performance_metrics_teamId_idx" ON "team_performance_metrics"("teamId");

-- CreateIndex
CREATE INDEX "team_performance_metrics_calculatedAt_idx" ON "team_performance_metrics"("calculatedAt");

-- CreateIndex
CREATE INDEX "product_complaint_metrics_productId_idx" ON "product_complaint_metrics"("productId");

-- CreateIndex
CREATE INDEX "product_complaint_metrics_calculatedAt_idx" ON "product_complaint_metrics"("calculatedAt");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sla_rules" ADD CONSTRAINT "product_sla_rules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_team_mappings" ADD CONSTRAINT "product_team_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_team_mappings" ADD CONSTRAINT "product_team_mappings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_categories" ADD CONSTRAINT "complaint_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "complaint_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_sla_tracking" ADD CONSTRAINT "complaint_sla_tracking_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedToTeam_fkey" FOREIGN KEY ("escalatedToTeam") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalatedToUser_fkey" FOREIGN KEY ("escalatedToUser") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_timeline" ADD CONSTRAINT "complaint_timeline_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_breach_logs" ADD CONSTRAINT "sla_breach_logs_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_performance_metrics" ADD CONSTRAINT "staff_performance_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_performance_metrics" ADD CONSTRAINT "team_performance_metrics_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_complaint_metrics" ADD CONSTRAINT "product_complaint_metrics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
