"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: string;
  teamName: string;
}

interface TeamMetricsData {
  teamId: string;
  teamName: string;
  workload: number;
  backlog: number;
  resolutionRate: number | null;
  slaCompliance: number | null;
  avgResolutionTimeHours: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({
  label, value, suffix, color, accent,
}: {
  label: string; value: string | number; suffix?: string; color: string; accent: string;
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
      <p className="mt-1 flex items-baseline gap-1 font-sans text-xl font-semibold tracking-tight" style={{ color: accent }}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-solvent/30">{suffix}</span>}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════

function ProgressBar({
  label, value, goodThreshold, warnThreshold,
}: {
  label: string; value: number | null; goodThreshold: number; warnThreshold: number;
}) {
  if (value === null) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(10,14,20,0.3)", border: "1px solid rgba(200,230,201,0.03)" }}>
        <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">{label}</p>
        <p className="mt-2 text-xs text-solvent/20 italic">Insufficient data</p>
      </div>
    );
  }

  const color = value >= goodThreshold
    ? "var(--color-aurora)"
    : value >= warnThreshold
      ? "var(--color-cosmic-dust)"
      : "var(--color-magma)";

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(10,14,20,0.3)", border: "1px solid rgba(200,230,201,0.03)" }}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">{label}</p>
        <span className="font-mono text-sm font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(10,14,20,0.5)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, value)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}44)`,
            boxShadow: `0 0 8px ${color}22`,
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM SELECTOR DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

function TeamSelector({
  teams, selectedId, onChange, isLoading,
}: {
  teams: TeamInfo[]; selectedId: string; onChange: (id: string) => void; isLoading: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading || teams.length === 0}
        className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm text-solvent/70 transition-all duration-300"
        style={{
          background: "rgba(10,14,20,0.4)",
          border: "1px solid rgba(200,230,201,0.06)",
        }}
      >
        {teams.length === 0 ? (
          <option value="">No teams available</option>
        ) : (
          teams.map((t) => (
            <option key={t.id} value={t.id} className="bg-hadal text-solvent">
              {t.teamName}
            </option>
          ))
        )}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-solvent/20">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKLOG GAUGE
// ═══════════════════════════════════════════════════════════════════════════

function BacklogGauge({ backlog, workload }: { backlog: number; workload: number }) {
  const ratio = workload > 0 ? (backlog / workload) * 100 : 0;
  const isHigh = ratio > 50;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: `linear-gradient(135deg, ${isHigh ? "rgba(255,111,60,0.06)" : "rgba(200,230,201,0.06)"}, transparent)`,
        border: `1px solid ${isHigh ? "rgba(255,111,60,0.1)" : "rgba(200,230,201,0.04)"}`,
      }}
    >
      <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">Backlog Ratio</p>
      <p className="mt-1 font-mono text-xl font-semibold tracking-tight" style={{ color: isHigh ? "var(--color-magma)" : "var(--color-cosmic-dust)" }}>
        {workload > 0 ? `${Math.round(ratio)}%` : "—"}
      </p>
      <p className="mt-0.5 text-[10px] text-solvent/20">
        {backlog} of {workload} open complaints older than 30 days
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════════════════

export default function TeamMetricsWidget() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [data, setData] = useState<TeamMetricsData | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch teams list ──────────────────────────────────────────────
  useEffect(() => {
    async function loadTeams() {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/v1/teams?pageSize=100", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load teams");
        const body = await res.json();
        const teamList: TeamInfo[] = body.data ?? [];
        setTeams(teamList);
        if (teamList.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teamList[0].id);
        }
      } catch {
        setError("Could not load teams");
      } finally {
        setIsLoadingTeams(false);
      }
    }
    loadTeams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch metrics when team changes ───────────────────────────────
  const fetchMetrics = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setIsLoadingMetrics(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/dashboard/team/${teamId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load team metrics");
      const body = await res.json();
      setData(body.data ?? null);
    } catch {
      setError("Could not load team metrics");
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) fetchMetrics(selectedTeamId);
  }, [selectedTeamId, fetchMetrics]);

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoadingTeams) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 w-64 rounded-xl" style={{ background: "rgba(19,26,36,0.5)", border: "1px solid rgba(200,230,201,0.03)" }} />
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

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,111,60,0.08)", border: "1px solid rgba(255,111,60,0.1)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17v0" stroke="rgba(255,111,60,0.6)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="rgba(255,111,60,0.3)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <p className="text-sm text-magma">{error}</p>
        <button onClick={() => selectedTeamId && fetchMetrics(selectedTeamId)} className="btn-phosphor rounded-full px-4 py-1.5 text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team selector */}
      <div className="flex items-center gap-3">
        <TeamSelector
          teams={teams}
          selectedId={selectedTeamId}
          onChange={setSelectedTeamId}
          isLoading={isLoadingTeams}
        />
        {isLoadingMetrics && <span className="spinner-ring shrink-0" />}
      </div>

      {data ? (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Workload" value={data.workload} color="rgba(200,230,201,1)" accent="var(--color-phosphor)" />
            <KpiCard label="Backlog" value={data.backlog} color="rgba(226,196,152,1)" accent="var(--color-cosmic-dust)" />
            <KpiCard label="Avg Resolution" value={data.avgResolutionTimeHours !== null ? `${data.avgResolutionTimeHours.toFixed(1)}h` : "—"} color="rgba(167,243,208,1)" accent="var(--color-aurora)" />
            <ProgressBar label="Resolution Rate" value={data.resolutionRate} goodThreshold={80} warnThreshold={50} />
            <ProgressBar label="SLA Compliance" value={data.slaCompliance} goodThreshold={95} warnThreshold={80} />
          </div>

          {/* Backlog detail */}
          <BacklogGauge backlog={data.backlog} workload={data.workload} />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-solvent/30">Select a team to view metrics</p>
        </div>
      )}
    </div>
  );
}
