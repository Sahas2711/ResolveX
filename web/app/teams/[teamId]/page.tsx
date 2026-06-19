"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

// ── Types ──────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  userId: string;
  userName: string;
  email: string;
  role: "lead" | "member";
  joinedAt: string;
}

interface ServerError {
  code: string;
  message: string;
}

// ── Particle Field ─────────────────────────────────────────────────────────

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 10 }, (_, i) => ({
        id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
        size: 1.2 + Math.random() * 2, delay: Math.random() * 8,
        duration: 5 + Math.random() * 7, dx: `${-30 + Math.random() * 60}px`,
      })),
    );
  }, []);

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
      <div className="absolute -top-[30%] -left-[20%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(46, 74, 74, 0.6) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────

function DeleteModal({
  teamName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: {
  teamName: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(255, 111, 60, 0.08)",
          boxShadow: "0 0 60px rgba(255, 111, 60, 0.04)",
        }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255, 111, 60, 0.15), rgba(255, 111, 60, 0.04))",
            border: "1px solid rgba(255, 111, 60, 0.12)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-solvent">Delete team?</h3>
        <p className="mt-2 text-sm leading-relaxed text-solvent/40">
          Are you sure you want to delete <span className="font-medium text-solvent/60">&ldquo;{teamName}&rdquo;</span>?
          All members will be unlinked. This action cannot be undone.
        </p>

        {error && (
          <div className="mt-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isDeleting ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)",
              color: "var(--color-magma)",
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Deleting...
              </span>
            ) : (
              "Delete permanently"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Member Modal ───────────────────────────────────────────────────────

function AddMemberModal({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (userId: string, role: "lead" | "member") => void;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"lead" | "member">("member");

  useEffect(() => {
    if (isOpen) { setUserId(""); setRole("member"); }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(46, 74, 74, 0.08)",
        }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(46, 74, 74, 0.2), rgba(46, 74, 74, 0.06))", border: "1px solid rgba(46, 74, 74, 0.12)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="rgba(46, 74, 74, 0.6)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="rgba(46, 74, 74, 0.6)" strokeWidth="1.5" />
              <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="rgba(46, 74, 74, 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-solvent">Add member</h3>
          <p className="mt-1 text-sm text-solvent/40">Enter the user ID to add to this team.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        <div className="mb-4 floating-label">
          <input
            id="memberUserId"
            type="text"
            autoComplete="off"
            placeholder=" "
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isSubmitting}
            className={`input-plasma w-full pb-2 pt-3 text-[14px] ${userId ? "filled" : ""}`}
          />
          <label htmlFor="memberUserId">User ID (UUID)</label>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <span className="text-[13px] font-medium tracking-wide text-solvent/40 uppercase">Role</span>
          <div className="flex gap-2">
            {(["member", "lead"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                disabled={isSubmitting}
                className="rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase transition-all duration-300"
                style={{
                  background: role === r ? "rgba(46, 74, 74, 0.15)" : "rgba(240, 244, 248, 0.02)",
                  border: role === r ? "1px solid rgba(46, 74, 74, 0.2)" : "1px solid rgba(240, 244, 248, 0.04)",
                  color: role === r ? "var(--color-bathyal)" : "rgba(240, 244, 248, 0.25)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(userId, role)}
            disabled={isSubmitting || !userId.trim()}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isSubmitting || !userId.trim() ? "rgba(46, 74, 74, 0.05)" : "rgba(46, 74, 74, 0.2)",
              border: "1px solid rgba(46, 74, 74, 0.15)",
              color: isSubmitting || !userId.trim() ? "rgba(240, 244, 248, 0.2)" : "var(--color-bathyal)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-bathyal border-t-transparent" />
                Adding...
              </span>
            ) : (
              "Add member"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEAM DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.TEAM_UPDATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.TEAM_DELETE]).allowed : false;

  // ── Fetch team & members ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated || !teamId) return;
    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [teamRes, membersRes] = await Promise.all([
          fetch(`/api/v1/teams/${teamId}`, { headers }),
          fetch(`/api/v1/teams/${teamId}/members`, { headers }),
        ]);

        if (teamRes.status === 404) { setError("Team not found"); setTeam(null); return; }
        if (!teamRes.ok) throw new Error("Failed to fetch");

        const teamBody = await teamRes.json();
        setTeam(teamBody.data ?? null);

        if (membersRes.ok) {
          const membersBody = await membersRes.json();
          setMembers(membersBody.data ?? []);
        }
      } catch { setError("Failed to load team"); } finally { setIsFetching(false); }
    })();
  }, [teamId, authLoading, isAuthenticated]);

  // ── Delete handler ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!team) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/teams/${team.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 409) {
        const body = await res.json();
        setDeleteError(body?.error?.message ?? "Team has active dependencies and cannot be deleted.");
        setIsDeleting(false);
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      router.push("/teams");
    } catch {
      setDeleteError("Failed to delete team. Please try again.");
      setIsDeleting(false);
    }
  }

  // ── Add member handler ───────────────────────────────────────────────────
  async function handleAddMember(userId: string, role: "lead" | "member") {
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, role }),
      });

      if (res.status === 404) {
        setAddMemberError("User not found. Please check the user ID.");
        setIsAddingMember(false);
        return;
      }
      if (res.status === 409) {
        setAddMemberError("This user is already a member of the team.");
        setIsAddingMember(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to add member");

      // Refresh members
      const membersRes = await fetch(`/api/v1/teams/${teamId}/members`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (membersRes.ok) {
        const body = await membersRes.json();
        setMembers(body.data ?? []);
      }
      setShowAddMember(false);
    } catch {
      setAddMemberError("Failed to add member. Please try again.");
    } finally {
      setIsAddingMember(false);
    }
  }

  // ── Remove member handler ────────────────────────────────────────────────
  async function handleRemoveMember(userId: string) {
    setRemovingUserId(userId);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/teams/${teamId}/members?userId=${userId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to remove member");

      // Re-fetch members to stay in sync with backend
      const membersRes = await fetch(`/api/v1/teams/${teamId}/members`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (membersRes.ok) {
        const body = await membersRes.json();
        setMembers(body.data ?? []);
      }
    } catch {
      // Silently fail — members list stays untouched
    } finally {
      setRemovingUserId(null);
    }
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  }
  if (!isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ParticleField />

      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(46, 74, 74, 0.04) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl">
        {/* ── Back link ── */}
        <button
          onClick={() => router.push("/teams")}
          className="mb-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to teams
        </button>

        {/* ── Loading ── */}
        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8" style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(46, 74, 74, 0.06)" }}>
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
          /* ── Error state ── */
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.6)" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <p className="text-sm text-magma">{error}</p>
            <button onClick={() => router.push("/teams")} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">Back to teams</button>
          </div>
        ) : team ? (
          <>
            {/* ── Team detail halo ── */}
            <div className="animate-fade-in rounded-[2.5rem] p-6 sm:p-10"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(46, 74, 74, 0.06)",
              }}
            >
              <div className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(46, 74, 74, 0.12) 50%, transparent 100%)" }}
                aria-hidden="true"
              />

              {/* ── Header ── */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--color-bathyal)", boxShadow: "0 0 8px rgba(46, 74, 74, 0.4)" }}
                    />
                    <h1 className="text-2xl font-medium text-solvent sm:text-3xl">{team.name}</h1>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-[11px] tracking-wide text-solvent/20 uppercase">
                    <span>Created {new Date(team.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 gap-2">
                  {canUpdate && (
                    <button
                      onClick={() => router.push(`/teams/${team.id}/edit`)}
                      className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-phosphor/10 hover:text-phosphor"
                      aria-label="Edit team"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                      aria-label="Delete team"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Description ── */}
              <div className="mb-8">
                <h2 className="mb-2 text-xs font-medium tracking-wider text-solvent/25 uppercase">Description</h2>
                {team.description ? (
                  <p className="font-serif text-base leading-relaxed text-solvent/60 sm:text-lg" style={{ fontStyle: "italic" }}>
                    {team.description}
                  </p>
                ) : (
                  <p className="text-sm text-solvent/20 italic">No description provided.</p>
                )}
              </div>

              {/* ── Team ID ── */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(46, 74, 74, 0.04)" }}>
                <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Team ID</span>
                <p className="mt-1 font-mono text-xs text-solvent/35">{team.id}</p>
              </div>
            </div>

            {/* ── Members Section ── */}
            <div className="mt-8 animate-fade-in rounded-[2.5rem] p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                border: "1px solid rgba(46, 74, 74, 0.06)",
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-solvent">Members</h2>
                  <p className="mt-0.5 text-xs text-solvent/30">{members.length} team member{members.length !== 1 ? "s" : ""}</p>
                </div>
                {canUpdate && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="btn-phosphor flex items-center gap-1.5 rounded-full px-4 py-2 text-xs"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Add member
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "rgba(46, 74, 74, 0.08)", border: "1px solid rgba(46, 74, 74, 0.06)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="rgba(46, 74, 74, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="rgba(46, 74, 74, 0.4)" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-solvent/30">No members yet. Add members to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-4 rounded-2xl p-4 transition-all duration-300"
                      style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(46, 74, 74, 0.04)" }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {/* Avatar placeholder */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                          style={{ background: member.role === "lead" ? "rgba(46, 74, 74, 0.25)" : "rgba(46, 74, 74, 0.12)" }}
                        >
                          <span className="text-xs font-medium tracking-wide uppercase"
                            style={{ color: member.role === "lead" ? "var(--color-bathyal)" : "rgba(46, 74, 74, 0.5)" }}
                          >
                            {member.userName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-solvent/70">{member.userName}</p>
                            {member.role === "lead" && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
                                style={{ background: "rgba(46, 74, 74, 0.12)", color: "var(--color-bathyal)" }}
                              >
                                Lead
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-solvent/25 font-mono">{member.email}</p>
                        </div>
                      </div>
                      {canUpdate && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingUserId === member.userId}
                          className="shrink-0 rounded-full p-2 text-solvent/15 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                          aria-label={`Remove ${member.userName}`}
                        >
                          {removingUserId === member.userId ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-magma border-t-transparent" />
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Delete Modal ── */}
      {showDeleteModal && team && (
        <DeleteModal
          teamName={team.name}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
        />
      )}

      {/* ── Add Member Modal ── */}
      <AddMemberModal
        isOpen={showAddMember}
        isSubmitting={isAddingMember}
        error={addMemberError}
        onClose={() => { setShowAddMember(false); setAddMemberError(null); }}
        onSubmit={handleAddMember}
      />
    </main>
  );
}
