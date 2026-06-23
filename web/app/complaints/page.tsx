"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";
import AppNavigation from "@/components/AppNavigation";

// -- Types ------------------------------------------------------------------

interface ComplaintItem {
  id: string;
  ticketNumber: string;
  userId: string;
  product: { id: string; name: string };
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  severity: "minor" | "major" | "critical";
  description: string;
  assignedTeam: { id: string; name: string } | null;
  assignedStaff: { id: string; name: string } | null;
  currentStatus:
    | "open"
    | "assigned"
    | "in_progress"
    | "waiting_for_customer"
    | "resolved"
    | "reopened"
    | "closed"
    | "escalated";
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// -- Status config ----------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open: {
    label: "Open",
    color: "var(--color-phosphor)",
    bg: "rgba(200, 230, 201, 0.08)",
    border: "1px solid rgba(200, 230, 201, 0.12)",
  },
  assigned: {
    label: "Assigned",
    color: "var(--color-aurora)",
    bg: "rgba(167, 243, 208, 0.08)",
    border: "1px solid rgba(167, 243, 208, 0.12)",
  },
  in_progress: {
    label: "In Progress",
    color: "var(--color-cosmic-dust)",
    bg: "rgba(226, 196, 152, 0.08)",
    border: "1px solid rgba(226, 196, 152, 0.12)",
  },
  waiting_for_customer: {
    label: "Waiting",
    color: "rgba(240, 244, 248, 0.4)",
    bg: "rgba(240, 244, 248, 0.04)",
    border: "1px solid rgba(240, 244, 248, 0.06)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--color-aurora)",
    bg: "rgba(167, 243, 208, 0.08)",
    border: "1px solid rgba(167, 243, 208, 0.12)",
  },
  reopened: {
    label: "Reopened",
    color: "var(--color-magma)",
    bg: "rgba(255, 111, 60, 0.08)",
    border: "1px solid rgba(255, 111, 60, 0.12)",
  },
  closed: {
    label: "Closed",
    color: "rgba(240, 244, 248, 0.25)",
    bg: "rgba(240, 244, 248, 0.02)",
    border: "1px solid rgba(240, 244, 248, 0.04)",
  },
  escalated: {
    label: "Escalated",
    color: "var(--color-magma)",
    bg: "rgba(255, 111, 60, 0.1)",
    border: "1px solid rgba(255, 111, 60, 0.15)",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "rgba(240, 244, 248, 0.3)" },
  medium: { label: "Med", color: "var(--color-cosmic-dust)" },
  high: { label: "High", color: "var(--color-magma)" },
  critical: { label: "Crit", color: "var(--color-magma)" },
};

// -- Particle Field ---------------------------------------------------------

function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
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
        style={{ background: "radial-gradient(ellipse, rgba(200, 230, 201, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// -- Status Badge -----------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase"
      style={{ background: cfg.bg, border: cfg.border, color: cfg.color }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}
      />
      {cfg.label}
    </span>
  );
}

// -- Priority Badge ---------------------------------------------------------

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.low;
  return (
    <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// -- Search Bar -------------------------------------------------------------

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="rgba(240, 244, 248, 0.2)" strokeWidth="1.5" fill="none" />
        <path d="M16 16l5 5" stroke="rgba(240, 244, 248, 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Search by ticket number or customer..."
        className="input-plasma w-full rounded-full py-2.5 pl-9 pr-4 text-[13px]"
        style={{ border: "1px solid rgba(240, 244, 248, 0.06)", borderRadius: "9999px" }}
      />
    </div>
  );
}

// -- Empty State ------------------------------------------------------------

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(200, 230, 201, 0.08), transparent 70%)",
          border: "1px solid rgba(200, 230, 201, 0.06)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" fill="none" />
          <path d="M12 8v4M12 16v0" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-solvent/50">No complaints yet</p>
        <p className="mt-1 text-xs text-solvent/30">Create your first complaint to start resolving.</p>
      </div>
      <button onClick={onCreate} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">
        Create complaint
      </button>
    </div>
  );
}

// -- Loading Skeleton -------------------------------------------------------

function ComplaintSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl p-5"
          style={{ background: "rgba(19, 26, 36, 0.5)", border: "1px solid rgba(200, 230, 201, 0.04)" }}>
          <div className="mb-3 flex gap-4">
            <div className="h-4 w-28 rounded bg-bathyal/20" />
            <div className="h-4 w-16 rounded bg-bathyal/10" />
            <div className="h-4 w-12 rounded bg-bathyal/10" />
          </div>
          <div className="h-3 w-4/5 rounded bg-bathyal/10" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPLAINTS LIST PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ComplaintsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const canCreate = profile ? checkPermissions(auth, [Permissions.COMPLAINT_CREATE]).allowed : false;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Fetch complaints -----------------------------------------------------
  const fetchComplaints = useCallback(async (p: number, q: string, s: string) => {
    setIsFetching(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (q) params.set("search", q);
      if (s && s !== "all") params.set("status", s);

      const res = await fetch(`/api/v1/complaints?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // If 404 (endpoint not implemented), gracefully show empty
      if (res.status === 404) {
        setComplaints([]);
        setMeta(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      setComplaints(body.data ?? []);
      setMeta(body.meta ?? null);
    } catch {
      setComplaints([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // -- Debounced search -----------------------------------------------------
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchComplaints(page, search, statusFilter), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [page, search, statusFilter, authLoading, isAuthenticated, fetchComplaints]);

  // -- Auth gate ------------------------------------------------------------
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  }
  if (!isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh px-4 pt-16 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      <AppNavigation />
      <ParticleField />

      {/* Ambient orb — Phosphor tint for complaints */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      {/* -- Header -- */}
      <div className="mx-auto mb-8 mt-6 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">Complaints</h1>
          <p className="mt-0.5 text-sm text-solvent/35">
            {meta ? `${meta.totalItems} ticket${meta.totalItems !== 1 ? "s" : ""} in system` : "Ticket directory"}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => router.push("/complaints/create")}
            className="btn-phosphor flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New complaint
          </button>
        )}
      </div>

      {/* -- Filters -- */}
      <div className="mx-auto mb-6 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "assigned", "in_progress", "resolved", "closed", "escalated"] as const).map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="rounded-full px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase transition-all duration-300"
              style={{
                background: statusFilter === s ? "rgba(200, 230, 201, 0.08)" : "rgba(240, 244, 248, 0.02)",
                border: statusFilter === s ? "1px solid rgba(200, 230, 201, 0.15)" : "1px solid rgba(240, 244, 248, 0.04)",
                color: statusFilter === s ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.25)",
              }}
            >
              {s === "in_progress" ? "In Prog" : s}
            </button>
          ))}
        </div>
      </div>

      {/* -- Complaint list -- */}
      <div className="mx-auto max-w-4xl">
        {isFetching ? (
          <ComplaintSkeleton />
        ) : complaints.length === 0 && !search && statusFilter === "all" ? (
          <EmptyState onCreate={() => router.push("/complaints/create")} />
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(200, 230, 201, 0.06)", border: "1px solid rgba(200, 230, 201, 0.06)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" fill="none" />
                <path d="M16 16l5 5" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm text-solvent/30">No complaints match your search criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint, i) => {
              const statusCfg = STATUS_CONFIG[complaint.currentStatus] ?? STATUS_CONFIG.open;
              const priorityCfg = PRIORITY_CONFIG[complaint.priority] ?? PRIORITY_CONFIG.low;
              return (
                <button key={complaint.id}
                  onClick={() => router.push(`/complaints/${complaint.id}`)}
                  className="group w-full animate-slide-up rounded-2xl p-4 sm:p-5 text-left transition-all duration-500 hover:scale-[1.01]"
                  style={{
                    background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                    border: "1px solid rgba(200, 230, 201, 0.04)",
                    animationDelay: `${i * 60}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Top row: ticket number + status + priority */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-medium text-phosphor/70 tracking-wide">
                          {complaint.ticketNumber}
                        </span>
                        <StatusBadge status={complaint.currentStatus} />
                        <PriorityBadge priority={complaint.priority} />
                      </div>

                      {/* Category / title */}
                      <p className="line-clamp-1 text-sm font-medium text-solvent group-hover:text-phosphor transition-colors">
                        {complaint.category}
                      </p>

                      {/* Description excerpt */}
                      <p className="mt-1 line-clamp-1 text-sm text-solvent/35">
                        {complaint.description}
                      </p>

                      {/* Metadata row */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tracking-wide text-solvent/20">
                        <span>{complaint.product.name}</span>
                        {complaint.assignedTeam && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block h-1 w-1 rounded-full bg-bathyal" />
                            {complaint.assignedTeam.name}
                          </span>
                        )}
                        <span>{new Date(complaint.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>

                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                      className="mt-1 shrink-0 text-solvent/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-phosphor">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* -- Pagination -- */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-full px-4 py-2 text-xs transition-all duration-300 disabled:opacity-20"
              style={{ border: "1px solid rgba(240, 244, 248, 0.06)", color: page <= 1 ? "rgba(240, 244, 248, 0.15)" : "var(--color-solvent)" }}
            >Previous</button>
            <span className="text-xs text-solvent/30 tabular-nums">{meta.page} / {meta.totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
              className="rounded-full px-4 py-2 text-xs transition-all duration-300 disabled:opacity-20"
              style={{ border: "1px solid rgba(240, 244, 248, 0.06)", color: page >= meta.totalPages ? "rgba(240, 244, 248, 0.15)" : "var(--color-solvent)" }}
            >Next</button>
          </div>
        )}
      </div>
    </main>
  );
}
