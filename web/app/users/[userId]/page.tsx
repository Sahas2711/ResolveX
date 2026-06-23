"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

// -- Types ------------------------------------------------------------------

interface UserDetail {
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

interface Role {
  id: string;
  name: string;
}

// -- Particle Field ---------------------------------------------------------

function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
      size: 1.2 + Math.random() * 2, delay: Math.random() * 8,
      duration: 5 + Math.random() * 7, dx: `${-30 + Math.random() * 60}px`,
    }))
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full bg-phosphor"
          style={{
            width: p.size, height: p.size, left: p.x, top: p.y, opacity: 0,
            animation: `particle-float ${p.duration}s ease-out ${p.delay}s infinite`,
            "--dx": p.dx, boxShadow: `0 0 ${p.size * 3}px rgba(200, 230, 201, 0.25)`,
          } as React.CSSProperties}
        />
      ))}
      <div className="absolute -top-[30%] -right-[20%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(226, 196, 152, 0.4) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// -- Delete Modal -----------------------------------------------------------

function DeleteModal({ userName, isDeleting, error, onConfirm, onCancel }: {
  userName: string; isDeleting: boolean; error: string | null;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(255, 111, 60, 0.08)",
        }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, rgba(255, 111, 60, 0.15), rgba(255, 111, 60, 0.04))", border: "1px solid rgba(255, 111, 60, 0.12)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-solvent">Delete user?</h3>
        <p className="mt-2 text-sm leading-relaxed text-solvent/40">
          Are you sure you want to delete <span className="font-medium text-solvent/60">&ldquo;{userName}&rdquo;</span>?
          This will disable their account and remove access.
        </p>
        {error && (
          <div className="mt-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isDeleting ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)", color: "var(--color-magma)",
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Deleting...
              </span>
            ) : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Assign Role Modal ------------------------------------------------------

function AssignRoleModal({ isOpen, isSubmitting, error, availableRoles, onClose, onSubmit }: {
  isOpen: boolean; isSubmitting: boolean; error: string | null;
  availableRoles: Role[]; onClose: () => void; onSubmit: (roleIds: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => { if (isOpen) setSelectedIds([]); }, [isOpen]);

  if (!isOpen) return null;

  function toggleRole(roleId: string) {
    setSelectedIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(226, 196, 152, 0.08)",
        }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(226, 196, 152, 0.2), rgba(226, 196, 152, 0.06))", border: "1px solid rgba(226, 196, 152, 0.12)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="rgba(226, 196, 152, 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-solvent">Assign roles</h3>
          <p className="mt-1 text-sm text-solvent/40">Select roles to assign to this user.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        {availableRoles.length === 0 ? (
          <div className="py-4 text-center text-sm text-solvent/30">No roles available to assign.</div>
        ) : (
          <div className="mb-6 space-y-2">
            {availableRoles.map((role) => (
              <button key={role.id} type="button" onClick={() => toggleRole(role.id)} disabled={isSubmitting}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-300"
                style={{
                  background: selectedIds.includes(role.id) ? "rgba(226, 196, 152, 0.08)" : "rgba(240, 244, 248, 0.02)",
                  border: selectedIds.includes(role.id) ? "1px solid rgba(226, 196, 152, 0.12)" : "1px solid rgba(240, 244, 248, 0.04)",
                }}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300`}
                  style={{
                    borderColor: selectedIds.includes(role.id) ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.15)",
                    background: selectedIds.includes(role.id) ? "var(--color-cosmic-dust)" : "transparent",
                  }}
                >
                  {selectedIds.includes(role.id) && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-abyss">
                      <path d="M6 12l4 4 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium tracking-wide uppercase text-solvent/60">{role.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={isSubmitting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >Cancel</button>
          <button onClick={() => onSubmit(selectedIds)} disabled={isSubmitting || selectedIds.length === 0}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isSubmitting || selectedIds.length === 0 ? "rgba(226, 196, 152, 0.05)" : "rgba(226, 196, 152, 0.15)",
              border: "1px solid rgba(226, 196, 152, 0.12)",
              color: isSubmitting || selectedIds.length === 0 ? "rgba(240, 244, 248, 0.2)" : "var(--color-cosmic-dust)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-cosmic-dust border-t-transparent" />
                Assigning...
              </span>
            ) : `Assign (${selectedIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN USER DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [assignRoleError, setAssignRoleError] = useState<string | null>(null);
  const [revokingRole, setRevokingRole] = useState<string | null>(null);

  const canManage = profile ? checkPermissions(auth, [Permissions.USER_MANAGE]).allowed : false;
  const canUpdate = profile ? checkPermissions(auth, [Permissions.USER_UPDATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.USER_DELETE]).allowed : false;

  const isOwnProfile = profile?.id === userId;

  // -- Fetch user & available roles -----------------------------------------
  useEffect(() => {
    if (authLoading || !isAuthenticated || !userId) return;
    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [userRes, rolesRes] = await Promise.all([
          fetch(`/api/v1/users/${userId}`, { headers }),
          canManage ? fetch("/api/v1/roles", { headers }) : Promise.resolve(null),
        ]);

        if (userRes.status === 404) { setError("User not found"); setUser(null); return; }
        if (!userRes.ok) throw new Error("Failed to fetch");
        const userBody = await userRes.json();
        setUser(userBody.data ?? null);

        if (rolesRes && rolesRes.ok) {
          const rolesBody = await rolesRes.json();
          setAllRoles(rolesBody.data ?? []);
        }
      } catch { setError("Failed to load user"); } finally { setIsFetching(false); }
    })();
  }, [userId, authLoading, isAuthenticated, canManage]);

  // -- Delete handler -------------------------------------------------------
  async function handleDelete() {
    if (!user) return;
    setIsDeleting(true); setDeleteError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 409) {
        const body = await res.json();
        setDeleteError(body?.error?.message ?? "Cannot delete this user.");
        setIsDeleting(false); return;
      }
      if (!res.ok) throw new Error("Delete failed");
      router.push("/users");
    } catch {
      setDeleteError("Failed to delete user. Please try again.");
      setIsDeleting(false);
    }
  }

  // -- Assign role handler --------------------------------------------------
  async function handleAssignRole(roleIds: string[]) {
    setIsAssigningRole(true); setAssignRoleError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/users/${userId}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ roleIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAssignRoleError(body?.error?.message ?? "Failed to assign roles.");
        setIsAssigningRole(false); return;
      }
      // Refresh user data
      const userRes = await fetch(`/api/v1/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (userRes.ok) {
        const body = await userRes.json();
        setUser(body.data ?? null);
      }
      setShowAssignRole(false);
    } catch {
      setAssignRoleError("Network error. Please try again.");
    } finally { setIsAssigningRole(false); }
  }

  // -- Revoke role handler --------------------------------------------------
  async function handleRevokeRole(roleName: string) {
    const role = allRoles.find((r) => r.name === roleName);
    if (!role) return;
    setRevokingRole(roleName);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/users/${userId}/roles?roleId=${role.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to revoke");
      // Refresh user data
      const userRes = await fetch(`/api/v1/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (userRes.ok) {
        const body = await userRes.json();
        setUser(body.data ?? null);
      }
    } catch { /* silent */ } finally { setRevokingRole(null); }
  }

  // -- Auth gate ------------------------------------------------------------
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login"); }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  const availableRoles = allRoles.filter((r) => !user?.roles.includes(r.name));

  return (
    <main className="relative min-h-dvh px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ParticleField />

      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(226, 196, 152, 0.04) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.push("/users")}
          className="mb-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to users
        </button>

        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8"
            style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(226, 196, 152, 0.04)" }}>
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.6)" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <p className="text-sm text-magma">{error}</p>
            <button onClick={() => router.push("/users")} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">Back to users</button>
          </div>
        ) : user ? (
          <>
            {/* User Detail Halo */}
            <div className="animate-fade-in rounded-[2.5rem] p-6 sm:p-10"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(226, 196, 152, 0.06)",
              }}
            >
              <div className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(226, 196, 152, 0.12) 50%, transparent 100%)" }}
                aria-hidden="true"
              />

              {/* Header */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: user.isActive && user.status === "ACTIVE"
                        ? "radial-gradient(circle at 35% 30%, rgba(226, 196, 152, 0.25), rgba(226, 196, 152, 0.08))"
                        : "rgba(240, 244, 248, 0.03)",
                      border: user.isActive && user.status === "ACTIVE"
                        ? "1px solid rgba(226, 196, 152, 0.15)"
                        : "1px solid rgba(240, 244, 248, 0.04)",
                    }}
                  >
                    <span className="text-xl font-medium" style={{ color: user.isActive && user.status === "ACTIVE" ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.2)" }}>
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-medium text-solvent sm:text-3xl">{user.name}</h1>
                    <div className="mt-1 flex items-center gap-2 text-sm text-solvent/35">
                      <span>{user.email}</span>
                      <span className="text-solvent/15">·</span>
                      <span className="font-mono text-xs">{user.employeeId}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  {canUpdate && (
                    <button onClick={() => router.push(`/users/${user.id}/edit`)}
                      className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-phosphor/10 hover:text-phosphor"
                      aria-label="Edit user">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  {canDelete && !isOwnProfile && (
                    <button onClick={() => setShowDeleteModal(true)}
                      className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                      aria-label="Delete user">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div className="mb-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
                  style={{
                    background: user.isActive && user.status === "ACTIVE" ? "rgba(167, 243, 208, 0.08)" : user.status === "SUSPENDED" ? "rgba(226, 196, 152, 0.08)" : "rgba(240, 244, 248, 0.03)",
                    border: user.isActive && user.status === "ACTIVE" ? "1px solid rgba(167, 243, 208, 0.12)" : user.status === "SUSPENDED" ? "1px solid rgba(226, 196, 152, 0.12)" : "1px solid rgba(240, 244, 248, 0.04)",
                    color: user.isActive && user.status === "ACTIVE" ? "var(--color-aurora)" : user.status === "SUSPENDED" ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.25)",
                  }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: user.isActive && user.status === "ACTIVE" ? "var(--color-aurora)" : user.status === "SUSPENDED" ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.15)",
                      boxShadow: user.isActive && user.status === "ACTIVE" ? "0 0 6px rgba(167, 243, 208, 0.5)" : "none",
                    }}
                  />
                  {user.status.toLowerCase()}
                </span>
                <span className="text-[11px] text-solvent/20 uppercase tracking-wide self-center">
                  Updated {new Date(user.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              {/* User ID + Dates */}
              <div className="mb-6 rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(226, 196, 152, 0.03)" }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">User ID</span>
                    <p className="mt-1 font-mono text-xs text-solvent/35">{user.id}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Joined</span>
                    <p className="mt-1 text-xs text-solvent/35">
                      {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Roles Section */}
            <div className="mt-8 animate-fade-in rounded-[2.5rem] p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                border: "1px solid rgba(226, 196, 152, 0.06)",
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-solvent">Roles</h2>
                  <p className="mt-0.5 text-xs text-solvent/30">{user.roles.length} role{user.roles.length !== 1 ? "s" : ""} assigned</p>
                </div>
                {canManage && availableRoles.length > 0 && (
                  <button onClick={() => setShowAssignRole(true)}
                    className="btn-phosphor flex items-center gap-1.5 rounded-full px-4 py-2 text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Assign role
                  </button>
                )}
              </div>

              {user.roles.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-sm text-solvent/30">No roles assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {user.roles.map((roleName) => {
                    const role = allRoles.find((r) => r.name === roleName);
                    return (
                      <div key={roleName} className="flex items-center justify-between gap-4 rounded-2xl p-4"
                        style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(226, 196, 152, 0.04)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ background: "rgba(226, 196, 152, 0.1)" }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="rgba(226, 196, 152, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium tracking-wide uppercase text-solvent/60">{roleName}</span>
                        </div>
                        {canManage && !isOwnProfile && (
                          <button onClick={() => handleRevokeRole(roleName)} disabled={revokingRole === roleName}
                            className="shrink-0 rounded-full p-2 text-solvent/15 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                            aria-label={`Revoke ${roleName}`}
                          >
                            {revokingRole === roleName ? (
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-magma border-t-transparent" />
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {showDeleteModal && user && (
        <DeleteModal userName={user.name} isDeleting={isDeleting} error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
        />
      )}

      <AssignRoleModal isOpen={showAssignRole} isSubmitting={isAssigningRole} error={assignRoleError}
        availableRoles={availableRoles}
        onClose={() => { setShowAssignRole(false); setAssignRoleError(null); }}
        onSubmit={handleAssignRole}
      />
    </main>
  );
}
