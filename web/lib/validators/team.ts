// =============================================================================
// Team Validators
// Matches the API-Specifications.yaml Team schemas
// =============================================================================

import { z } from "zod";

// ── Team Member Role ───────────────────────────────────────────────────────
// API spec: "role" is enum [lead, member]
// Prisma:    TeamMemberRole = LEAD | MEMBER
export const ApiTeamMemberRole = z.enum(["lead", "member"]);
export type ApiTeamMemberRole = z.infer<typeof ApiTeamMemberRole>;

export function mapApiRoleToPrisma(
  role: ApiTeamMemberRole
): "LEAD" | "MEMBER" {
  return role === "lead" ? "LEAD" : "MEMBER";
}

export function mapPrismaRoleToApi(
  role: string
): ApiTeamMemberRole {
  return role === "LEAD" ? "lead" : "member";
}

// ── Create Team Schema ─────────────────────────────────────────────────────
// API spec: { name: string, maxLength: 100, required }
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be at most 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .trim()
    .optional()
    .default(""),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

// ── Update Team Schema ─────────────────────────────────────────────────────
// API spec: PUT /teams/{teamId} { name: string, maxLength: 100, required }
export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name must be at most 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .trim()
    .optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

// ── List Teams Query Schema ────────────────────────────────────────────────
export const listTeamsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

export type ListTeamsInput = z.infer<typeof listTeamsSchema>;

// ── Add Member Schema ──────────────────────────────────────────────────────
// API spec: POST /teams/{teamId}/members { userId, role: lead|member }
export const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  role: ApiTeamMemberRole,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// ── Team Response Shape ────────────────────────────────────────────────────
export interface TeamResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberResponse {
  userId: string;
  userName: string;
  email: string;
  role: ApiTeamMemberRole;
  joinedAt: string;
}

// ── Helper: Map a Prisma Team row to the API response shape ────────────────

export interface TeamSelectShape {
  id: string;
  teamName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toTeamResponse(team: TeamSelectShape): TeamResponse {
  return {
    id: team.id,
    name: team.teamName,
    description: team.description,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

// ── Helper: Map a Prisma TeamMember row to the API response shape ──────────

export interface TeamMemberSelectShape {
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function toTeamMemberResponse(member: TeamMemberSelectShape): TeamMemberResponse {
  return {
    userId: member.userId,
    userName: `${member.user.firstName} ${member.user.lastName}`,
    email: member.user.email,
    role: mapPrismaRoleToApi(member.role),
    joinedAt: member.joinedAt.toISOString(),
  };
}
