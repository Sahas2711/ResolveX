"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────

interface StaffMetricsData {
  staffId: string;
  staffName: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  reopened: number;
  escalated: number;
  avgResolutionTimeHours: number | null;
  avgFirstResponseTimeMinutes: number | null;
  productivityScore: number | null;
}

interface StaffMetricsWidgetProps {
  staffId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC CARD (mini)
// ═══════════════════════════════════════════════════════════════════════════

function MetricCard({
  label, value, color, accent,
}: {
  label: string; value: string | number; color: string; accent: string;
}) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${color}06, ${color}02)`,
        border: `1px solid ${color}10`,
      }}
    >
      <p className="text-[10px] font-medium tracking-wider text-solvent/25 uppercase">{label}</p>
      <p className="mt-1 font-sans text-xl font-semibold tracking-tight" style={{ color: accent }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTIVITY GAUGE
// ═══════════════════════════════════════════════════════════════════════════

function ProductivityGauge({ score }: { score: number | null }) {
  if (score === null) {
    return <p className="text-xs text-solvent/20 italic">Insufficient data</p>;
  }

  const color = score >= 80
    ? "var(--color-aurora)"
    : score >= 50
      ? "var(--color-cosmic-dust)"
      : "var(--color-magma)";

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        {/* Background ring */}
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(10,14,20,0.5)" strokeWidth="5" />
          <circle
            cx="36" cy="36" r="30" fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 188.5} 188.5`}
            style={{
              transition: "stroke-dasharray 1s ease-in-out",
              filter: `drop-shadow(0 0 6px ${color}44)`,
            }}
          />
        </svg>
        <span className="font-mono text-xl font-bold tracking-tight" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wider text-solvent/25 uppercase">Productivity</p>
        <p className="mt-0.5 text-[11px] text-solvent/20">
          {score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs improvement"}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME METRIC CARD
// ═══════════════════════════════════════════════════════════════════════════

function TimeMetricCard({
  label, value, unit, color, icon,
}: {
  label: string; value: number | null; unit: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        background: "rgba(10,14,20,0.3)",
        border: "1px solid rgba(200,230,201,0.03)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-solvent/30">{icon}</span>
        <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">{label}</p>
      </div>
      <p className="font-mono text-xl font-semibold tracking-tight" style={{ color }}>
        {value !== null ? `${value.toFixed(1)} ${unit}` : "—"}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS PILLS
// ═══════════════════════════════════════════════════════════════════════════

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
      style={{
        background: `${color}0a`,
        border: `1px solid ${color}15`,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-solvent/50">{label}</span>
      <span className="ml-auto font-mono tabular-nums text-solvent/70">{count}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════════════════

export default function StaffMetricsWidget({ staffId }: StaffMetricsWidgetProps) {
  const [data, setData] = useState<StaffMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/dashboard/staff/${staffId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load staff metrics");
      const body = await res.json();
      setData(body.data ?? null);
    } catch {
      setError("Could not load performance data");
    } finally {
      setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl p-4" style={{ background: "rgba(19,26,36,0.5)", border: "1px solid rgba(200,230,201,0.03)" }}>
              <div className="h-3 w-2/3 rounded bg-bathyal/10" />
              <div className="mt-2 h-6 w-1/2 rounded bg-bathyal/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,111,60,0.08)", border: "1px solid rgba(255,111,60,0.1)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17v0" stroke="rgba(255,111,60,0.6)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="rgba(255,111,60,0.3)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <p className="text-sm text-magma">{error ?? "No data available"}</p>
        <button onClick={fetchData} className="btn-phosphor rounded-full px-4 py-1.5 text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row — name + productivity gauge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-solvent/90">{data.staffName}</h3>
          <p className="text-xs text-solvent/25">
            {data.totalAssigned} total assigned · {data.completed} completed
          </p>
        </div>
        <ProductivityGauge score={data.productivityScore} />
      </div>

      {/* KPI grid — status counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Completed" value={data.completed} color="rgba(167,243,208,1)" accent="var(--color-aurora)" />
        <MetricCard label="Pending" value={data.pending} color="rgba(226,196,152,1)" accent="var(--color-cosmic-dust)" />
        <MetricCard label="Reopened" value={data.reopened} color="rgba(255,111,60,1)" accent="var(--color-magma)" />
        <MetricCard label="Escalated" value={data.escalated} color="rgba(255,111,60,1)" accent="var(--color-magma)" />
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        <StatusPill label="Resolved" count={data.completed} color="var(--color-aurora)" />
        <StatusPill label="Assigned" count={data.pending} color="var(--color-phosphor)" />
        <StatusPill label="Reopened" count={data.reopened} color="rgba(255,111,60,0.8)" />
        <StatusPill label="Escalated" count={data.escalated} color="rgba(255,111,60,0.5)" />
      </div>

      {/* Time metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TimeMetricCard
          label="Avg Resolution Time"
          value={data.avgResolutionTimeHours}
          unit="h"
          color="var(--color-phosphor)"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        />
        <TimeMetricCard
          label="Avg First Response"
          value={data.avgFirstResponseTimeMinutes}
          unit="min"
          color="var(--color-aurora)"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
