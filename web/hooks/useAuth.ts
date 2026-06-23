// =============================================================================
// useAuth — Client-side authentication hook
// Provides token management, user info, and frontend permission checking.
// Fetches resolved roles and permissions from GET /api/v1/auth/me.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PermissionKey, RoleName } from "@/lib/permissions";

// -- Types ------------------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  isActive: boolean;
  status: string;
  profileImageUrl: string | null;
  createdAt: string;
  roles: string[];
  permissions: string[];
}

export interface AuthState {
  /** Whether the user is authenticated. */
  isAuthenticated: boolean;
  /** Whether auth state is still loading. */
  isLoading: boolean;
  /** The user's profile with resolved roles and permissions (fetched from /me). */
  profile: UserProfile | null;
}

// -- Token helpers ----------------------------------------------------------

const TOKEN_KEYS = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
  REMEMBER: "rememberMe",
} as const;

/**
 * Store tokens in localStorage after successful login/refresh.
 */
export function storeTokens(
  accessToken: string,
  refreshToken: string,
  persist = false,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
  if (persist) {
    localStorage.setItem(TOKEN_KEYS.REMEMBER, "true");
  }
}

/**
 * Clear all stored tokens (logout).
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  localStorage.removeItem(TOKEN_KEYS.REMEMBER);
}

/**
 * Get the stored access token.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

/**
 * Get the stored refresh token.
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

/**
 * Check whether the user chose to persist their session.
 */
export function isPersisted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOKEN_KEYS.REMEMBER) === "true";
}

// -- Base64 JWT decode ------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT is expired by reading the `exp` claim.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() >= payload.exp * 1000;
}

// -- Fetch user profile -----------------------------------------------------

async function fetchProfile(accessToken: string): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body.data as UserProfile) ?? null;
  } catch {
    return null;
  }
}

// -- useAuth hook -----------------------------------------------------------

/**
 * React hook for authentication state management.
 * Fetches the user's full profile (with resolved roles and permissions)
 * from GET /api/v1/auth/me.
 *
 * Usage:
 * ```tsx
 * const { isAuthenticated, isLoading, profile } = useAuth();
 * if (isLoading) return <div className="spinner-ring" />;
 * if (!isAuthenticated) redirect("/login");
 * console.log(profile.roles); // ["CUSTOMER"]
 * console.log(profile.permissions); // ["complaint:create", ...]
 * ```
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    profile: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = getAccessToken();

      if (!token || isTokenExpired(token)) {
        clearTokens();
        if (!cancelled) {
          setState({ isAuthenticated: false, isLoading: false, profile: null });
        }
        return;
      }

      // Fetch user profile with resolved roles/permissions
      const profile = await fetchProfile(token);

      if (!cancelled) {
        if (profile) {
          setState({ isAuthenticated: true, isLoading: false, profile });
        } else {
          // Profile fetch failed — token might be expired or user deleted
          clearTokens();
          setState({ isAuthenticated: false, isLoading: false, profile: null });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// -- usePermissions hook ----------------------------------------------------

/**
 * Hook to check if the current user has ALL specified permissions.
 * Requires a profile fetch via useAuth() internally.
 *
 * Usage:
 * ```tsx
 * const { allowed, isLoading } = usePermissions([Permissions.COMPLAINT_CREATE]);
 * if (allowed) { /* render create button *\/ }
 * ```
 */
/**
 * Derive permission check result from an AuthState.
 * Use this instead of `usePermissions()` to avoid redundant API calls
 * when you already have an `AuthState` from `useAuth()`.
 */
export function checkPermissions(
  auth: AuthState,
  requiredPermissions: PermissionKey[],
): { allowed: boolean; isLoading: boolean } {
  if (auth.isLoading) {
    return { allowed: false, isLoading: true };
  }

  if (!auth.isAuthenticated || !auth.profile) {
    return { allowed: false, isLoading: false };
  }

  if (requiredPermissions.length === 0) {
    return { allowed: true, isLoading: false };
  }

  const allowed = requiredPermissions.every((perm) =>
    auth.profile!.permissions.includes(perm),
  );

  return { allowed, isLoading: false };
}

/**
 * Hook to check if the current user has ALL specified permissions.
 * Fetches profile from GET /api/v1/auth/me on mount.
 * If you call both usePermissions and useRoles in the same component,
 * prefer using useAuth() + checkPermissions() instead to avoid duplicate API calls.
 *
 * Usage:
 * ```tsx
 * const { allowed, isLoading } = usePermissions([Permissions.COMPLAINT_CREATE]);
 * if (allowed) { /* render create button *\/ }
 * ```
 */
export function usePermissions(
  requiredPermissions: PermissionKey[],
): { allowed: boolean; isLoading: boolean } {
  return checkPermissions(useAuth(), requiredPermissions);
}

// -- useRoles hook ----------------------------------------------------------

/**
 * Hook to check if the current user has at least ONE of the specified roles.
 * Requires a profile fetch via useAuth() internally.
 *
 * Usage:
 * ```tsx
 * const { hasRole, isLoading } = useRoles([Roles.ADMIN]);
 * if (hasRole) { /* render admin panel *\/ }
 * ```
 */
/**
 * Derive role check result from an AuthState.
 * Use this instead of `useRoles()` to avoid redundant API calls
 * when you already have an `AuthState` from `useAuth()`.
 */
export function checkRoles(
  auth: AuthState,
  requiredRoles: RoleName[],
): { hasRole: boolean; isLoading: boolean } {
  if (auth.isLoading) {
    return { hasRole: false, isLoading: true };
  }

  if (!auth.isAuthenticated || !auth.profile) {
    return { hasRole: false, isLoading: false };
  }

  if (requiredRoles.length === 0) {
    return { hasRole: true, isLoading: false };
  }

  const hasRole = requiredRoles.some((role) =>
    auth.profile!.roles.includes(role),
  );

  return { hasRole, isLoading: false };
}

/**
 * Hook to check if the current user has at least ONE of the specified roles.
 * Fetches profile from GET /api/v1/auth/me on mount.
 * If you call both useRoles and usePermissions in the same component,
 * prefer using useAuth() + checkRoles() instead to avoid duplicate API calls.
 *
 * Usage:
 * ```tsx
 * const { hasRole, isLoading } = useRoles([Roles.ADMIN]);
 * if (hasRole) { /* render admin panel *\/ }
 * ```
 */
export function useRoles(
  requiredRoles: RoleName[],
): { hasRole: boolean; isLoading: boolean } {
  return checkRoles(useAuth(), requiredRoles);
}

// -- useRolePermissions hook ------------------------------------------------

/**
 * Hook that returns all permissions for a user's resolved roles.
 *
 * Usage:
 * ```tsx
 * const { permissions, isLoading } = useRolePermissions();
 * if (permissions.includes(Permissions.COMPLAINT_CREATE)) { /* ... *\/ }
 * ```
 */
export function useRolePermissions(): {
  permissions: string[];
  isLoading: boolean;
} {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return { permissions: [], isLoading: true };
  }

  if (!isAuthenticated || !profile) {
    return { permissions: [], isLoading: false };
  }

  return { permissions: profile.permissions, isLoading: false };
}

// -- useRequireAuth hook ----------------------------------------------------

/**
 * Hook that redirects to /login if the user is not authenticated.
 *
 * Usage:
 * ```tsx
 * useRequireAuth(); // redirects to /login
 * ```
 */
export function useRequireAuth(redirectTo = "/login"): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}
