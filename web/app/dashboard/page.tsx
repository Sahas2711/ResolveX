"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, useAuth } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";
import AppNavigation from "@/components/AppNavigation";
import StaffMetricsWidget from "@/components/dashboard/StaffMetricsWidget";
import TeamMetricsWidget from "@/components/dashboard/TeamMetricsWidget";
import ProductAnalyticsWidget from "@/components/dashboard/ProductAnalyticsWidget";

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  overview: {
    totalComplaints: number;
    openComplaints: number;
    inProgressComplaints: number;
    resolvedComplaints: number;
    closedComplaints: number;
    escalatedComplaints: number;
    reopenedComplaints: number;
    assignedComplaints: number;
    waitingCustomer: number;
  };
  breakdown: {
    byStatus: Array<{ status: string; count: number; label: string }>;
    byPriority: Array<{ priority: string; count: number; label: string }>;
  };
  recentActivity: Array<{
    id: string;
    ticketNumber: string;
    currentStatus: string;
    priority: string;
    category: string;
    productName: string;
    assignedTeamName: string | null;
    assignedAgentName: string | null;
    createdAt: string;
  }>;
  teamWorkload: Array<{
    teamId: string;
    teamName: string;
    totalAssigned: number;
    activeTickets: number;
    memberCount: number;
    leadName: string | null;
  }>;
  agentLoad: Array<{
    userId: string;
    name: string;
    activeTickets: number;
    totalAssigned: number;
  }>;
  performance: {
    avgResolutionTimeHours: number | null;
    slaComplianceRate: number | null;
    ticketsCreatedToday: number;
    ticketsResolvedToday: number;
  };
}

// ── Theme tokens ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  OPEN:             { label: "Open", color: "var(--color-phosphor)", bg: "rgba(200, 230, 201, 0.08)", glow: "0 0 6px rgba(200, 230, 201, 0.3)" },
  ASSIGNED:         { label: "Assigned", color: "var(--color-aurora)", bg: "rgba(167, 243, 208, 0.08)", glow: "0 0 6px rgba(167, 243, 208, 0.3)" },
  IN_PROGRESS:      { label: "In Progress", color: "var(--color-cosmic-dust)", bg: "rgba(226, 196, 152, 0.08)", glow: "0 0 6px rgba(226, 196, 152, 0.3)" },
  WAITING_CUSTOMER: { label: "Waiting", color: "rgba(240, 244, 248, 0.4)", bg: "rgba(240, 244, 248, 0.04)", glow: "none" },
  RESOLVED:         { label: "Resolved", color: "var(--color-aurora)", bg: "rgba(167, 243, 208, 0.08)", glow: "0 0 6px rgba(167, 243, 208, 0.3)" },
  CLOSED:           { label: "Closed", color: "rgba(240, 244, 248, 0.25)", bg: "rgba(240, 244, 248, 0.02)", glow: "none" },
  REOPENED:         { label: "Reopened", color: "var(--color-magma)", bg: "rgba(255, 111, 60, 0.08)", glow: "0 0 6px rgba(255, 111, 60, 0.3)" },
  ESCALATED:        { label: "Escalated", color: "var(--color-magma)", bg: "rgba(255, 111, 60, 0.1)", glow: "0 0 8px rgba(255, 111, 60, 0.4)" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  LOW:     { label: "Low", color: "rgba(240, 244, 248, 0.3)" },
  MEDIUM:  { label: "Medium", color: "var(--color-cosmic-dust)" },
  HIGH:    { label: "High", color: "var(--color-magma)" },
  CRITICAL: { label: "Critical", color: "var(--color-magma)" },
};

const ACTIVE_STATUSES = ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "REOPENED"];

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE FIELD
// ═══════════════════════════════════════════════════════════════════════════

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
      size: 1.2 + Math.random() * 2.5, delay: Math.random() * 10,
      duration: 5 + Math.random() * 8, dx: `${-40 + Math.random() * 80}px`,
    })));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full bg-phosphor"
          style={{
            width: p.size, height: p.size, left: p.x, top: p.y, opacity: 0,
            animation: `particle-float ${p.duration}s ease-out ${p.delay}s infinite`,
            "--dx": p.dx, boxShadow: `0 0 ${p.size * 3}px rgba(200, 230, 201, 0.2)`,
          } as React.CSSProperties}
        />
      ))}
      <div className="absolute -top-[25%] -right-[15%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(200, 230, 201, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 18s ease-in-out infinite" }}
      />
      <div className="absolute -bottom-[20%] -left-[10%] h-[50%] w-[35%] rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.3) 0%, transparent 70%)", filter: "blur(120px)", animation: "drift 20s ease-in-out infinite reverse" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({
  label, value, sublabel, color, accent, glow, delay,
}: {
  label: string; value: string | number; sublabel?: string;
  color: string; accent: string; glow: string; delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="rounded-[1.5rem] p-5 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        background: `linear-gradient(135deg, ${color}06, ${color}02)`,
        border: `1px solid ${color}10`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wider text-solvent/25 uppercase">{label}</p>
          <p className="mt-1.5 font-sans text-2xl font-semibold tracking-tight" style={{ color: accent }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sublabel && (
            <p className="mt-0.5 text-[11px] text-solvent/25">{sublabel}</p>
          )}
        </div>
        <div
          className="mt-1 h-8 w-8 shrink-0 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, ${accent}20, ${accent}08)`, border: `1px solid ${accent}15`, boxShadow: glow }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BREAKDOWN BAR
// ═══════════════════════════════════════════════════════════════════════════

function StatusBreakdown({ data, total }: { data: DashboardData["breakdown"]["byStatus"]; total: number }) {
  const activeStatuses = data.filter((s) => s.count > 0);

  return (
    <div>
      <div className="mb-4 flex h-2.5 overflow-hidden rounded-full"
        style={{ background: "rgba(10, 14, 20, 0.5)" }}
      >
        {activeStatuses.map((s) => {
          const cfg = STATUS_COLORS[s.status];
          const pct = total > 0 ? (s.count / total) * 100 : 0;
          if (pct < 0.5) return null;
          return (
            <div
              key={s.status}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: cfg?.color ?? "rgba(240, 244, 248, 0.1)",
                opacity: 0.7,
                boxShadow: cfg?.glow !== "none" ? cfg?.glow : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {activeStatuses.map((s) => {
          const cfg = STATUS_COLORS[s.status];
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div key={s.status} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: cfg?.color ?? "rgba(240, 244, 248, 0.1)" }}
              />
              <span className="text-solvent/40">{s.label}</span>
              <span className="ml-auto font-mono text-solvent/60 tabular-nums">{s.count}</span>
              <span className="text-solvent/20 tabular-nums">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

function PriorityDistribution({ data }: { data: DashboardData["breakdown"]["byPriority"] }) {
  const total = data.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="space-y-2.5">
      {data.map((p) => {
        const cfg = PRIORITY_MAP[p.priority];
        const pct = total > 0 ? (p.count / total) * 100 : 0;
        return (
          <div key={p.priority}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-solvent/50">{cfg?.label ?? p.priority}</span>
              <span className="font-mono text-solvent/40 tabular-nums">{p.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(10, 14, 20, 0.5)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: cfg?.color ?? "rgba(240, 244, 248, 0.1)",
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RECENT ACTIVITY FEED
// ═══════════════════════════════════════════════════════════════════════════

function RecentActivity({ items, onNavigate }: { items: DashboardData["recentActivity"]; onNavigate: (id: string) => void }) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const sc = STATUS_COLORS[item.currentStatus] ?? STATUS_COLORS.OPEN;
        const pc = PRIORITY_MAP[item.priority] ?? PRIORITY_MAP.LOW;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 hover:bg-white/[0.02]"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {/* Status dot */}
            <span className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: sc.color, boxShadow: sc.glow }}
            />
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-phosphor/60">{item.ticketNumber}</span>
                <span className="truncate text-xs text-solvent/50">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-solvent/20">
                <span>{item.productName}</span>
                {item.assignedTeamName && <span>· {item.assignedTeamName}</span>}
                {item.assignedAgentName && <span>· {item.assignedAgentName}</span>}
              </div>
            </div>
            {/* Priority + time */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-[10px] font-mono tracking-wide" style={{ color: pc.color }}>
                {pc.label}
              </span>
              <span className="text-[10px] text-solvent/15 tabular-nums">
                {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="py-8 text-center text-xs text-solvent/20">No recent activity</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM WORKLOAD GRID
// ═══════════════════════════════════════════════════════════════════════════

function TeamWorkload({ data }: { data: DashboardData["teamWorkload"] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((team) => {
        const loadPct = team.memberCount > 0
          ? Math.min(100, Math.round((team.totalAssigned / team.memberCount) * 20))
          : 0;
        const isHeavy = loadPct > 60;
        return (
          <div
            key={team.teamId}
            className="rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01]"
            style={{
              background: "rgba(10, 14, 20, 0.3)",
              border: isHeavy ? "1px solid rgba(255, 111, 60, 0.08)" : "1px solid rgba(200, 230, 201, 0.03)",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-solvent/70">{team.teamName}</span>
              <span className="text-[10px] text-solvent/25 font-mono">{team.memberCount} members</span>
            </div>
            {team.leadName && (
              <p className="mb-2 text-[10px] text-solvent/20">Lead: {team.leadName}</p>
            )}
            <div className="mb-2 flex items-center gap-3 text-xs">
              <div>
                <span className="font-mono text-sm font-medium" style={{ color: isHeavy ? "var(--color-magma)" : "var(--color-phosphor)" }}>
                  {team.activeTickets}
                </span>
                <span className="ml-1 text-solvent/30">active</span>
              </div>
              <div>
                <span className="font-mono text-sm text-solvent/50">{team.totalAssigned}</span>
                <span className="ml-1 text-solvent/20">total</span>
              </div>
            </div>
            {/* Load bar */}
            <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(10, 14, 20, 0.5)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, loadPct)}%`,
                  background: isHeavy
                    ? "linear-gradient(90deg, var(--color-magma), rgba(255, 111, 60, 0.4))"
                    : "linear-gradient(90deg, var(--color-phosphor), rgba(200, 230, 201, 0.3))",
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <p className="col-span-full py-8 text-center text-xs text-solvent/20">No team data available</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT LOAD LIST
// ═══════════════════════════════════════════════════════════════════════════

function AgentLoad({ data }: { data: DashboardData["agentLoad"] }) {
  const maxLoad = data.length > 0 ? Math.max(...data.map((a) => a.activeTickets)) : 1;

  return (
    <div className="space-y-2">
      {data.slice(0, 12).map((agent) => {
        const pct = maxLoad > 0 ? (agent.activeTickets / maxLoad) * 100 : 0;
        const isBusy = pct > 70;
        return (
          <div key={agent.userId} className="flex items-center gap-3">
            <span className="w-28 truncate text-xs text-solvent/50">{agent.name}</span>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(10, 14, 20, 0.5)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isBusy
                      ? "linear-gradient(90deg, var(--color-magma), rgba(255, 111, 60, 0.3))"
                      : "linear-gradient(90deg, var(--color-aurora), rgba(167, 243, 208, 0.2))",
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
            <span className="w-8 text-right font-mono text-xs tabular-nums"
              style={{ color: isBusy ? "var(--color-magma)" : "var(--color-solvent)" }}
            >
              {agent.activeTickets}
            </span>
          </div>
        );
      })}
      {data.length === 0 && (
        <p className="py-6 text-center text-xs text-solvent/20">No active agents</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

function Section({ title, subtitle, icon, children, className = "" }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={`animate-fade-in rounded-[2rem] p-5 sm:p-7 ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(19, 26, 36, 0.55), rgba(26, 31, 40, 0.45))",
        backdropFilter: "blur(24px) saturate(0.8)",
        border: "1px solid rgba(200, 230, 201, 0.04)",
      }}
    >
      <div className="mb-5 flex items-center gap-2.5">
        {icon && <span className="text-phosphor/50">{icon}</span>}
        <div>
          <h2 className="text-sm font-medium text-solvent/80">{title}</h2>
          {subtitle && <p className="text-[11px] text-solvent/20">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  // ── Tab navigation ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: "grid" },
    ...(profile?.permissions.includes(Permissions.DASHBOARD_STAFF)
      ? [{ id: "staff", label: "My Performance", icon: "user" }]
      : []),
    ...(profile?.permissions.includes(Permissions.DASHBOARD_TEAM)
      ? [{ id: "team", label: "Teams", icon: "users" }]
      : []),
    ...(profile?.permissions.includes(Permissions.DASHBOARD_PRODUCT)
      ? [{ id: "product", label: "Products", icon: "box" }]
      : []),
  ] as const;

  // Reset to overview when switching permissions
  useEffect(() => {
    const tabIds = tabs.map((t) => t.id);
    if (!tabIds.includes(activeTab as never)) {
      setActiveTab("overview");
    }
  }, [tabs, activeTab]);

  const [data, setData] = useState<DashboardData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch dashboard data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/v1/dashboard", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const body = await res.json();
      setData(body.data ?? null);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchData();
  }, [authLoading, isAuthenticated, fetchData]);

  // ── Auth gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  const activeCount = data
    ? data.overview.assignedComplaints +
      data.overview.inProgressComplaints +
      data.overview.waitingCustomer +
      data.overview.reopenedComplaints
    : 0;

  return (
    <main className="relative min-h-dvh px-4 pt-20 pb-12 sm:px-6 lg:px-8">
      <AppNavigation />
      <ParticleField />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl">
        {/* ── Header ── */}
        <div className="mb-8 mt-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">Dashboard</h1>
            <p className="mt-0.5 text-sm text-solvent/30">
              {data ? `${data.overview.totalComplaints.toLocaleString()} total complaints` : "Overview"}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isFetching}
            className="rounded-full p-2 transition-all duration-300 hover:bg-white/[0.03] disabled:opacity-30"
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              className={isFetching ? "animate-spin" : ""}
            >
              <path d="M1 4v6h6M23 20v-6h-6" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="mb-8 flex gap-1 rounded-2xl p-1"
          style={{
            background: "rgba(10,14,20,0.4)",
            border: "1px solid rgba(200,230,201,0.04)",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 rounded-xl px-4 py-2 text-xs font-medium transition-all duration-300"
              style={{
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, rgba(200,230,201,0.1), rgba(200,230,201,0.04))"
                  : "transparent",
                color: activeTab === tab.id
                  ? "var(--color-phosphor)"
                  : "rgba(240,244,248,0.3)",
                border: activeTab === tab.id
                  ? "1px solid rgba(200,230,201,0.1)"
                  : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "overview" && (
          <div
            className="animate-fade-in rounded-[2rem] p-5 sm:p-7"
            style={{
              background: "linear-gradient(135deg, rgba(19,26,36,0.55), rgba(26,31,40,0.45))",
              backdropFilter: "blur(24px) saturate(0.8)",
              border: "1px solid rgba(200,230,201,0.04)",
            }}
          >
            {activeTab === "staff" && <StaffMetricsWidget staffId={profile?.id ?? ""} />}
            {activeTab === "team" && <TeamMetricsWidget />}
            {activeTab === "product" && <ProductAnalyticsWidget />}
          </div>
        )}

        {activeTab === "overview" && (error ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.6)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <p className="text-sm text-magma">{error}</p>
            <button onClick={fetchData} className="btn-phosphor rounded-full px-5 py-2 text-sm">Retry</button>
          </div>
        ) : isFetching && !data ? (
          /* ── Loading skeleton ── */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-[1.5rem] p-5"
                  style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.5), rgba(26, 31, 40, 0.4))", border: "1px solid rgba(200, 230, 201, 0.03)" }}
                >
                  <div className="h-3 w-2/3 rounded bg-bathyal/10" />
                  <div className="mt-3 h-8 w-1/2 rounded bg-bathyal/10" />
                </div>
              ))}
            </div>
            <div className="animate-pulse rounded-[2rem] p-7"
              style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.5), rgba(26, 31, 40, 0.4))", border: "1px solid rgba(200, 230, 201, 0.03)" }}
            >
              <div className="h-4 w-32 rounded bg-bathyal/10" />
              <div className="mt-4 h-3 w-full rounded bg-bathyal/10" />
              <div className="mt-2 h-3 w-4/5 rounded bg-bathyal/10" />
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* ═══ KPI ROW ═══ */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Total" value={data.overview.totalComplaints} color="rgba(200, 230, 201, 1)" accent="var(--color-phosphor)" glow="0 0 8px rgba(200, 230, 201, 0.15)" delay={0} />
              <KpiCard label="Open" value={data.overview.openComplaints} color="rgba(200, 230, 201, 1)" accent="var(--color-phosphor)" glow="0 0 8px rgba(200, 230, 201, 0.15)" delay={60} />
              <KpiCard label="Active" value={activeCount} sublabel="assigned + progress + waiting" color="rgba(226, 196, 152, 1)" accent="var(--color-cosmic-dust)" glow="0 0 8px rgba(226, 196, 152, 0.15)" delay={120} />
              <KpiCard label="Resolved" value={data.overview.resolvedComplaints} color="rgba(167, 243, 208, 1)" accent="var(--color-aurora)" glow="0 0 8px rgba(167, 243, 208, 0.15)" delay={180} />
              <KpiCard label="Escalated" value={data.overview.escalatedComplaints} color="rgba(255, 111, 60, 1)" accent="var(--color-magma)" glow="0 0 8px rgba(255, 111, 60, 0.15)" delay={240} />
              <KpiCard label="Today" value={`${data.performance.ticketsCreatedToday} / ${data.performance.ticketsResolvedToday}`} sublabel="created / resolved" color="rgba(240, 244, 248, 1)" accent="rgba(240, 244, 248, 0.6)" glow="0 0 8px rgba(240, 244, 248, 0.08)" delay={300} />
            </div>

            {/* ═══ MAIN GRID: Status Breakdown + Recent Activity ═══ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Status Breakdown — 2 cols */}
              <div className="lg:col-span-2">
                <Section
                  title="Status Breakdown"
                  subtitle={`${data.breakdown.byStatus.reduce((s, i) => s + i.count, 0)} complaints`}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M7 16l4-6 4 4 4-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                    </svg>
                  }
                >
                  <StatusBreakdown data={data.breakdown.byStatus} total={data.overview.totalComplaints} />
                </Section>
              </div>

              {/* Priority Distribution — 1 col */}
              <div>
                <Section
                  title="Priority Distribution"
                  subtitle="By complaint priority"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  }
                >
                  <PriorityDistribution data={data.breakdown.byPriority} />
                </Section>
              </div>
            </div>

            {/* ═══ SECOND ROW: Team Workload + Agent Load + Recent Activity ═══ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Team Workload */}
              <div className="lg:col-span-2">
                <Section
                  title="Team Workload"
                  subtitle={`${data.teamWorkload.length} team${data.teamWorkload.length !== 1 ? "s" : ""}`}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    </svg>
                  }
                >
                  <TeamWorkload data={data.teamWorkload} />
                </Section>
              </div>

              {/* Agent Load */}
              <div>
                <Section
                  title="Agent Load"
                  subtitle={`${data.agentLoad.length} agent${data.agentLoad.length !== 1 ? "s" : ""} active`}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  }
                >
                  <AgentLoad data={data.agentLoad} />
                </Section>
              </div>
            </div>

            {/* ═══ THIRD ROW: Recent Activity + Performance ═══ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recent Activity — 2 cols */}
              <div className="lg:col-span-2">
                <Section
                  title="Recent Activity"
                  subtitle="Latest complaints"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    </svg>
                  }
                >
                  <RecentActivity items={data.recentActivity} onNavigate={(id) => router.push(`/complaints/${id}`)} />
                </Section>
              </div>

              {/* Performance Summary — 1 col */}
              <div>
                <Section
                  title="Performance"
                  subtitle="Resolution metrics"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  <div className="space-y-4">
                    <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                      <p className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">SLA Compliance Rate</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight"
                        style={{ color: (data.performance.slaComplianceRate ?? 0) >= 90 ? "var(--color-aurora)" : "var(--color-magma)" }}
                      >
                        {data.performance.slaComplianceRate !== null ? `${data.performance.slaComplianceRate}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                      <p className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Avg Resolution Time</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-solvent/80">
                        {data.performance.avgResolutionTimeHours !== null
                          ? `${data.performance.avgResolutionTimeHours.toFixed(1)}h`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                      <p className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Resolution Rate</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-solvent/80">
                        {data.overview.totalComplaints > 0
                          ? `${Math.round((data.overview.resolvedComplaints / data.overview.totalComplaints) * 100)}%`
                          : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-solvent/20">
                        {data.overview.resolvedComplaints} resolved of {data.overview.totalComplaints} total
                      </p>
                    </div>
                  </div>
                </Section>
              </div>
            </div>
          </div>
        ) : null)}
      </div>
    </main>
  );
}
