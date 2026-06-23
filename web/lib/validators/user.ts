// =============================================================================
// User Validators
// Matches the API-Specifications.yaml User schemas
// =============================================================================

import { z } from "zod";

// -- User Status ------------------------------------------------------------
// API spec: "isActive" boolean
// Prisma:    UserStatus = ACTIVE | INACTIVE | SUSPENDED
export function mapPrismaStatus(isActive: boolean, status: string): "active" | "inactive" | "suspended" {
  if (!isActive) return "inactive";
  if (status === "ACTIVE") return "active";
  if (status === "SUSPENDED") return "suspended";
  return "inactive";
}

// -- Update User Schema -----------------------------------------------------
// API spec: PUT /users/{userId} { name?, email?, isActive? }
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(150, "Name must be at most 150 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// -- List Users Query Schema ------------------------------------------------
export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  sort: z.string().optional().default("-createdAt"),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

// -- Assign Roles Schema ----------------------------------------------------
// API spec: POST /users/{userId}/roles { roleIds: string[] }
export const assignRolesSchema = z.object({
  roleIds: z
    .array(z.string().uuid("Invalid role ID format"))
    .min(1, "At least one role ID is required"),
});

export type AssignRolesInput = z.infer<typeof assignRolesSchema>;

// -- User Response Shape ----------------------------------------------------
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  isActive: boolean;
  status: string;
  profileImageUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// -- Helper: Map a Prisma User row to the API response shape ----------------

export interface UserSelectShape {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  isActive: boolean;
  status: string;
  profileImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  userRoles?: Array<{ role: { name: string } }>;
}

export function toUserResponse(user: UserSelectShape): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    employeeId: user.employeeId,
    isActive: user.isActive,
    status: user.status,
    profileImageUrl: user.profileImageUrl,
    roles: user.userRoles?.map((ur: { role: { name: string } }) => ur.role.name) ?? [],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
