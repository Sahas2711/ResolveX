"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

// -- Types ------------------------------------------------------------------

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
  roles: string[];
}

interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

// -- RBAC Role Badge Styling ------------------------------------------------
// Maps system RBAC role names to their display label and visual theme.
// Each role has a distinct color derived from the ResolveX palette.

const ROLE_BADGE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  ADMIN: {
    label: "Admin",
    color: "var(--color-magma)",
    bg: "rgba(255, 111, 60, 0.1)",
    border: "1px solid rgba(255, 111, 60, 0.15)",
  },
  SUPPORT_AGENT: {
    label: "Agent",
    color: "var(--color-phosphor)",
    bg: "rgba(200, 230, 201, 0.08)",
    border: "1px solid rgba(200, 230, 201, 0.12)",
  },
  TEAM_LEAD: {
    label: "Team Lead",
    color: "var(--color-cosmic-dust)",
    bg: "rgba(226, 196, 152, 0.1)",
    border: "1px solid rgba(226, 196, 152, 0.15)",
  },
  PRODUCT_MANAGER: {
    label: "PM",
    color: "var(--color-aurora)",
    bg: "rgba(167, 243, 208, 0.08)",
    border: "1px solid rgba(167, 243, 208, 0.12)",
  },
  CUSTOMER: {
    label: "Customer",
    color: "rgba(240, 244, 248, 0.4)",
    bg: "rgba(240, 244, 248, 0.04)",
    border: "1px solid rgba(240, 244, 248, 0.06)",
  },
};

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
      <div className="absolute -top-[30%] -left-[20%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(46, 74, 74, 0.6) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// -- Delete Team Confirmation Modal -----------------------------------------

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

// -- Remove Member Confirmation Modal ---------------------------------------

function RemoveMemberModal({
  memberName,
  isRemoving,
  error,
  onConfirm,
  onCancel,
}: {
  memberName: string;
  isRemoving: boolean;
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
        }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255, 111, 60, 0.12), rgba(255, 111, 60, 0.03))",
            border: "1px solid rgba(255, 111, 60, 0.1)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 7l-5 5m0 0l-5-5m5 5V3" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-solvent">Remove member?</h3>
        <p className="mt-2 text-sm leading-relaxed text-solvent/40">
          Are you sure you want to remove <span className="font-medium text-solvent/60">&ldquo;{memberName}&rdquo;</span>?
          They will lose access to this team.
        </p>

        {error && (
          <div className="mt-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isRemoving}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >
            Keep member
          </button>
          <button
            onClick={onConfirm}
            disabled={isRemoving}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isRemoving ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)",
              color: "var(--color-magma)",
              opacity: isRemoving ? 0.5 : 1,
            }}
          >
            {isRemoving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Removing...
              </span>
            ) : (
              "Remove"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Add Member Modal (with user search) ------------------------------------

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [role, setRole] = useState<"lead" | "member">("member");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      setRole("member");
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || selectedUser) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/users?search=${encodeURIComponent(searchQuery)}&pageSize=10`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          const users: UserSearchResult[] = body?.data ?? [];
          setSearchResults(users.filter((u) => u.id !== undefined));
          setShowDropdown(users.length > 0);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, selectedUser]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  function handleSelectUser(user: UserSearchResult) {
    setSelectedUser(user);
    setSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
    setShowDropdown(false);
    setSearchResults([]);
  }

  function handleClearSelection() {
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md animate-slide-up rounded-[2rem] p-6 sm:p-8"
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
              <path d="M19 8v6M22 11h-6" stroke="rgba(46, 74, 74, 0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-solvent">Add member</h3>
          <p className="mt-1 text-sm text-solvent/40">Search and select a user to add to this team.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        {/* -- User Search -- */}
        <div ref={searchRef} className="relative mb-4">
          {selectedUser ? (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: "rgba(46, 74, 74, 0.1)", border: "1px solid rgba(46, 74, 74, 0.15)" }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(46, 74, 74, 0.2)" }}
              >
                <span className="text-xs font-medium text-bathyal">
                  {selectedUser.firstName.charAt(0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-solvent/70">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="truncate text-xs text-solvent/30 font-mono">{selectedUser.email}</p>
              </div>
              <button
                onClick={handleClearSelection}
                disabled={isSubmitting}
                className="shrink-0 rounded-full p-1 text-solvent/20 transition-colors hover:text-magma"
                aria-label="Clear selection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="floating-label">
              <input
                id="userSearch"
                type="text"
                autoComplete="off"
                placeholder=" "
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className={`input-plasma w-full pb-2 pt-3 text-[14px] ${searchQuery ? "filled" : ""}`}
              />
              <label htmlFor="userSearch">
                {isSearching ? "Searching..." : "Search by name or email"}
              </label>
            </div>
          )}

          {/* -- Search dropdown -- */}
          {showDropdown && searchResults.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-2xl p-1 animate-fade-in"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(46, 74, 74, 0.12)",
              }}
            >
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(46, 74, 74, 0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(46, 74, 74, 0.15)" }}
                  >
                    <span className="text-xs font-medium text-bathyal">
                      {user.firstName.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-solvent/70">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-solvent/30 font-mono">{user.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[10px] text-solvent/20 font-mono">
                    {user.employeeId}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* -- Role selector -- */}
        <div className="mb-6 flex items-center gap-3 sm:gap-4">
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

        {/* -- Buttons -- */}
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
            onClick={() => selectedUser && onSubmit(selectedUser.id, role)}
            disabled={isSubmitting || !selectedUser}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isSubmitting || !selectedUser ? "rgba(46, 74, 74, 0.05)" : "rgba(46, 74, 74, 0.2)",
              border: "1px solid rgba(46, 74, 74, 0.15)",
              color: isSubmitting || !selectedUser ? "rgba(240, 244, 248, 0.2)" : "var(--color-bathyal)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-bathyal border-t-transparent" />
                Adding...
              </span>
            ) : (
              selectedUser ? `Add as ${role}` : "Select a user"
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
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.TEAM_UPDATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.TEAM_DELETE]).allowed : false;

  // -- Fetch team & members -------------------------------------------------
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

  // -- Re-fetch members helper ----------------------------------------------
  const refreshMembers = useCallback(async () => {
    const token = getAccessToken();
    const res = await fetch(`/api/v1/teams/${teamId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const body = await res.json();
      setMembers(body.data ?? []);
    }
  }, [teamId]);

  // -- Delete handler -------------------------------------------------------
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

  // -- Add member handler ---------------------------------------------------
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

      await refreshMembers();
      setShowAddMember(false);
    } catch {
      setAddMemberError("Failed to add member. Please try again.");
    } finally {
      setIsAddingMember(false);
    }
  }

  // -- Remove member handler ------------------------------------------------
  async function handleRemoveMember() {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    setRemoveMemberError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/teams/${teamId}/members?userId=${memberToRemove.userId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to remove member");

      await refreshMembers();
      setMemberToRemove(null);
    } catch {
      setRemoveMemberError("Failed to remove member. Please try again.");
    } finally {
      setIsRemovingMember(false);
    }
  }

  // -- Auth gate ------------------------------------------------------------
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
        {/* -- Back link -- */}
        <button
          onClick={() => router.push("/teams")}
          className="mb-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to teams
        </button>

        {/* -- Loading -- */}
        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8" style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(46, 74, 74, 0.06)" }}>
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
          /* -- Error state -- */
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
            {/* -- Team detail halo -- */}
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

              {/* -- Header -- */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: "var(--color-bathyal)", boxShadow: "0 0 8px rgba(46, 74, 74, 0.4)" }}
                    />
                    <h1 className="text-2xl font-medium text-solvent sm:text-3xl">{team.name}</h1>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-wide text-solvent/20 uppercase">
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

              {/* -- Description -- */}
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

              {/* -- Team ID -- */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(46, 74, 74, 0.04)" }}>
                <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Team ID</span>
                <p className="mt-1 font-mono text-xs text-solvent/35">{team.id}</p>
              </div>
            </div>

            {/* -- Members Section -- */}
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
                    <span className="hidden sm:inline">Add member</span>
                    <span className="sm:hidden">Add</span>
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
                      className="group flex items-center justify-between gap-3 rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:bg-bathyal/5"
                      style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(46, 74, 74, 0.04)" }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300"
                          style={{ background: member.role === "lead" ? "rgba(46, 74, 74, 0.25)" : "rgba(46, 74, 74, 0.12)" }}
                        >
                          <span className="text-xs font-medium tracking-wide uppercase"
                            style={{ color: member.role === "lead" ? "var(--color-bathyal)" : "rgba(46, 74, 74, 0.5)" }}
                          >
                            {member.userName.charAt(0)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="truncate text-sm font-medium text-solvent/70">{member.userName}</p>
                            {member.role === "lead" && (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
                                style={{ background: "rgba(46, 74, 74, 0.12)", color: "var(--color-bathyal)" }}
                              >
                                Lead
                              </span>
                            )}
                            {/* -- System RBAC role badges -- */}
                            {member.roles.map((roleName) => {
                              const badge = ROLE_BADGE_CONFIG[roleName];
                              if (!badge) return null;
                              return (
                                <span
                                  key={roleName}
                                  className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-mono tracking-wider"
                                  style={{
                                    background: badge.bg,
                                    color: badge.color,
                                    border: badge.border,
                                  }}
                                >
                                  {badge.label}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="truncate text-xs text-solvent/25 font-mono">{member.email}</p>
                            <span className="hidden sm:inline text-[10px] text-solvent/15">
                              Joined {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canUpdate && (
                        <button
                          onClick={() => setMemberToRemove(member)}
                          className="shrink-0 rounded-full p-2 text-solvent/15 transition-all duration-300 hover:bg-magma/10 hover:text-magma opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Remove ${member.userName}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
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

      {/* -- Delete Team Modal -- */}
      {showDeleteModal && team && (
        <DeleteModal
          teamName={team.name}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
        />
      )}

      {/* -- Remove Member Modal -- */}
      {memberToRemove && (
        <RemoveMemberModal
          memberName={memberToRemove.userName}
          isRemoving={isRemovingMember}
          error={removeMemberError}
          onConfirm={handleRemoveMember}
          onCancel={() => { setMemberToRemove(null); setRemoveMemberError(null); }}
        />
      )}

      {/* -- Add Member Modal -- */}
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
