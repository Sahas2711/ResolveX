"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";
import AppNavigation from "@/components/AppNavigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface Complaint {
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
  resolutionNotes: string | null;
  slaFirstResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  open: {
    label: "Open", color: "var(--color-phosphor)",
    bg: "rgba(200, 230, 201, 0.08)", glow: "0 0 8px rgba(200, 230, 201, 0.3)",
  },
  assigned: {
    label: "Assigned", color: "var(--color-aurora)",
    bg: "rgba(167, 243, 208, 0.08)", glow: "0 0 8px rgba(167, 243, 208, 0.3)",
  },
  in_progress: {
    label: "In Progress", color: "var(--color-cosmic-dust)",
    bg: "rgba(226, 196, 152, 0.08)", glow: "0 0 8px rgba(226, 196, 152, 0.3)",
  },
  waiting_for_customer: {
    label: "Waiting", color: "rgba(240, 244, 248, 0.4)",
    bg: "rgba(240, 244, 248, 0.04)", glow: "none",
  },
  resolved: {
    label: "Resolved", color: "var(--color-aurora)",
    bg: "rgba(167, 243, 208, 0.08)", glow: "0 0 8px rgba(167, 243, 208, 0.3)",
  },
  reopened: {
    label: "Reopened", color: "var(--color-magma)",
    bg: "rgba(255, 111, 60, 0.08)", glow: "0 0 8px rgba(255, 111, 60, 0.3)",
  },
  closed: {
    label: "Closed", color: "rgba(240, 244, 248, 0.25)",
    bg: "rgba(240, 244, 248, 0.02)", glow: "none",
  },
  escalated: {
    label: "Escalated", color: "var(--color-magma)",
    bg: "rgba(255, 111, 60, 0.1)", glow: "0 0 12px rgba(255, 111, 60, 0.4)",
  },
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "rgba(240, 244, 248, 0.3)" },
  { value: "medium", label: "Medium", color: "var(--color-cosmic-dust)" },
  { value: "high", label: "High", color: "var(--color-magma)" },
  { value: "critical", label: "Critical", color: "var(--color-magma)" },
];

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor", color: "rgba(240, 244, 248, 0.3)" },
  { value: "major", label: "Major", color: "var(--color-cosmic-dust)" },
  { value: "critical", label: "Critical", color: "var(--color-magma)" },
];

// ── Particle Field ─────────────────────────────────────────────────────────

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 10 }, (_, i) => ({
      id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
      size: 1.2 + Math.random() * 2, delay: Math.random() * 8,
      duration: 5 + Math.random() * 7, dx: `${-30 + Math.random() * 60}px`,
    })));
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
      <div className="absolute -top-[30%] -right-[20%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(200, 230, 201, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Editable Field ─────────────────────────────────────────────────────────

function EditableField({ label, value, isEditing, children }: {
  label: string; value: string; isEditing: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-4 transition-all duration-300"
      style={{
        background: isEditing ? "rgba(200, 230, 201, 0.04)" : "rgba(10, 14, 20, 0.3)",
        border: isEditing ? "1px solid rgba(200, 230, 201, 0.1)" : "1px solid rgba(200, 230, 201, 0.03)",
      }}
    >
      <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPLAINT DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const complaintId = params.complaintId as string;
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing state
  const [editField, setEditField] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<string>("");
  const [editSeverity, setEditSeverity] = useState<string>("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.COMPLAINT_UPDATE]).allowed : false;

  // ── Fetch complaint ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated || !complaintId) return;
    (async () => {
      setIsFetching(true); setError(null);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/complaints/${complaintId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 404) { setError("Complaint not found"); setComplaint(null); return; }
        if (!res.ok) throw new Error("Failed to fetch");
        const body = await res.json();
        setComplaint(body.data ?? null);
      } catch { setError("Failed to load complaint"); } finally { setIsFetching(false); }
    })();
  }, [complaintId, authLoading, isAuthenticated]);

  // ── Init edit values when complaint loads ───────────────────────────────
  useEffect(() => {
    if (complaint) {
      setEditPriority(complaint.priority);
      setEditSeverity(complaint.severity);
      setEditDescription(complaint.description);
      setEditCategory(complaint.category);
    }
  }, [complaint]);

  // ── Save field update ────────────────────────────────────────────────────
  async function handleSaveField(field: string) {
    if (!complaint) return;
    setIsSaving(true); setSaveError(null); setSaveSuccess(null);

    const updatePayload: Record<string, string> = {};
    if (field === "priority") updatePayload.priority = editPriority;
    if (field === "severity") updatePayload.severity = editSeverity;
    if (field === "description") updatePayload.description = editDescription;
    if (field === "category") updatePayload.category = editCategory;

    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSaveError(body?.error?.message ?? "Failed to save changes.");
        return;
      }

      const body = await res.json();
      setComplaint(body.data ?? null);
      setEditField(null);
      setSaveSuccess("Changes saved.");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally { setIsSaving(false); }
  }

  // ── Cancel editing ──────────────────────────────────────────────────────
  function handleCancelEdit() {
    setEditField(null);
    setSaveError(null);
    if (complaint) {
      setEditPriority(complaint.priority);
      setEditSeverity(complaint.severity);
      setEditDescription(complaint.description);
      setEditCategory(complaint.category);
    }
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login"); }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh px-4 pt-16 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      <AppNavigation />
      <ParticleField />

      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl">
        {/* ── Back link ── */}
        <button onClick={() => router.push("/complaints")}
          className="mb-6 mt-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to complaints
        </button>

        {/* ── Save feedback ── */}
        {saveSuccess && (
          <div className="mb-4 animate-slide-up rounded-2xl px-4 py-2.5 text-sm"
            style={{ background: "rgba(167, 243, 208, 0.08)", border: "1px solid rgba(167, 243, 208, 0.12)", color: "var(--color-aurora)" }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-aurora" style={{ boxShadow: "0 0 6px rgba(167, 243, 208, 0.5)" }} />
              {saveSuccess}
            </div>
          </div>
        )}

        {saveError && (
          <div className="mb-4 animate-slide-up rounded-2xl px-4 py-2.5 text-sm"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.12)", color: "var(--color-magma)" }}
            role="alert"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-magma" style={{ boxShadow: "0 0 6px rgba(255, 111, 60, 0.4)" }} />
              {saveError}
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8"
            style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(200, 230, 201, 0.04)" }}
          >
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
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
            <button onClick={() => router.push("/complaints")} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">Back to complaints</button>
          </div>
        ) : complaint ? (
          <>
            {/* ── Complaint detail halo ── */}
            <div className="animate-fade-in rounded-[2.5rem] p-6 sm:p-10"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(200, 230, 201, 0.06)",
              }}
            >
              <div className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.12) 50%, transparent 100%)" }}
                aria-hidden="true"
              />

              {/* ── Header ── */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-base font-medium text-phosphor tracking-wide">
                      {complaint.ticketNumber}
                    </span>
                    {(() => {
                      const sc = STATUS_CONFIG[complaint.currentStatus] ?? STATUS_CONFIG.open;
                      return (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
                          style={{ background: sc.bg, border: "1px solid rgba(240, 244, 248, 0.06)", color: sc.color }}
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.color, boxShadow: sc.glow }} />
                          {sc.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-wide text-solvent/20 uppercase">
                    <span>Created {new Date(complaint.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>Updated {new Date(complaint.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    {complaint.closedAt && <span>Closed {new Date(complaint.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                </div>
              </div>

              {/* ── Product & Category ── */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                  <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Product</span>
                  <p className="mt-1 text-sm text-solvent/70">{complaint.product.name}</p>
                </div>

                {/* Category — inline editable */}
                <EditableField label="Category" value={complaint.category} isEditing={editField === "category"}>
                  {editField === "category" ? (
                    <div className="space-y-2">
                      <input type="text" value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="input-plasma w-full text-[14px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveField("category")} disabled={isSaving}
                          className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                          style={{ background: "rgba(200, 230, 201, 0.15)", color: "var(--color-phosphor)" }}
                        >
                          {isSaving ? <span className="inline-block h-3 w-3 animate-spin rounded-full border border-phosphor border-t-transparent" /> : "Save"}
                        </button>
                        <button onClick={handleCancelEdit}
                          className="rounded-full px-3 py-1 text-[11px] text-solvent/40 transition-all hover:text-solvent"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => canUpdate ? setEditField("category") : undefined}
                      className="group flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm text-solvent/70">{complaint.category}</span>
                      {canUpdate && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          className="shrink-0 text-solvent/15 opacity-0 transition-all group-hover:opacity-100" aria-hidden="true">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </EditableField>
              </div>

              {/* ── Priority — inline editable ── */}
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <EditableField label="Priority" value={complaint.priority} isEditing={editField === "priority"}>
                  {editField === "priority" ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {PRIORITY_OPTIONS.map((opt) => (
                          <button key={opt.value} type="button" onClick={() => setEditPriority(opt.value)}
                            className="rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase transition-all"
                            style={{
                              background: editPriority === opt.value ? "rgba(200, 230, 201, 0.12)" : "rgba(240, 244, 248, 0.03)",
                              border: editPriority === opt.value ? "1px solid rgba(200, 230, 201, 0.2)" : "1px solid rgba(240, 244, 248, 0.04)",
                              color: editPriority === opt.value ? opt.color : "rgba(240, 244, 248, 0.3)",
                            }}
                          >{opt.label}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveField("priority")} disabled={isSaving}
                          className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                          style={{ background: "rgba(200, 230, 201, 0.15)", color: "var(--color-phosphor)" }}
                        >Save</button>
                        <button onClick={handleCancelEdit}
                          className="rounded-full px-3 py-1 text-[11px] text-solvent/40 transition-all hover:text-solvent"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => canUpdate ? setEditField("priority") : undefined}
                      className="group flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm font-mono tracking-wide"
                        style={{ color: (PRIORITY_OPTIONS.find((o) => o.value === complaint.priority) ?? PRIORITY_OPTIONS[0]).color }}
                      >
                        {(PRIORITY_OPTIONS.find((o) => o.value === complaint.priority) ?? PRIORITY_OPTIONS[0]).label}
                      </span>
                      {canUpdate && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          className="shrink-0 text-solvent/15 opacity-0 transition-all group-hover:opacity-100" aria-hidden="true">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </EditableField>

                {/* Severity — inline editable */}
                <EditableField label="Severity" value={complaint.severity} isEditing={editField === "severity"}>
                  {editField === "severity" ? (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {SEVERITY_OPTIONS.map((opt) => (
                          <button key={opt.value} type="button" onClick={() => setEditSeverity(opt.value)}
                            className="rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase transition-all"
                            style={{
                              background: editSeverity === opt.value ? "rgba(255, 111, 60, 0.1)" : "rgba(240, 244, 248, 0.03)",
                              border: editSeverity === opt.value ? "1px solid rgba(255, 111, 60, 0.2)" : "1px solid rgba(240, 244, 248, 0.04)",
                              color: editSeverity === opt.value ? opt.color : "rgba(240, 244, 248, 0.3)",
                            }}
                          >{opt.label}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveField("severity")} disabled={isSaving}
                          className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                          style={{ background: "rgba(200, 230, 201, 0.15)", color: "var(--color-phosphor)" }}
                        >Save</button>
                        <button onClick={handleCancelEdit}
                          className="rounded-full px-3 py-1 text-[11px] text-solvent/40 transition-all hover:text-solvent"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => canUpdate ? setEditField("severity") : undefined}
                      className="group flex w-full items-center justify-between text-left"
                    >
                      <span className="text-sm font-mono tracking-wide"
                        style={{ color: (SEVERITY_OPTIONS.find((o) => o.value === complaint.severity) ?? SEVERITY_OPTIONS[0]).color }}
                      >
                        {(SEVERITY_OPTIONS.find((o) => o.value === complaint.severity) ?? SEVERITY_OPTIONS[0]).label}
                      </span>
                      {canUpdate && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          className="shrink-0 text-solvent/15 opacity-0 transition-all group-hover:opacity-100" aria-hidden="true">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </EditableField>
              </div>

              {/* ── Description — inline editable ── */}
              <div className="mb-6">
                <EditableField label="Description" value={complaint.description} isEditing={editField === "description"}>
                  {editField === "description" ? (
                    <div className="space-y-2">
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                        className="input-plasma w-full resize-none text-[14px] leading-relaxed" rows={4} autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-solvent/20">{editDescription.length} / 5000</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveField("description")} disabled={isSaving}
                            className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                            style={{ background: "rgba(200, 230, 201, 0.15)", color: "var(--color-phosphor)" }}
                          >{isSaving ? "Saving..." : "Save"}</button>
                          <button onClick={handleCancelEdit}
                            className="rounded-full px-3 py-1 text-[11px] text-solvent/40 transition-all hover:text-solvent"
                          >Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => canUpdate ? setEditField("description") : undefined}
                      className="group flex w-full items-start justify-between gap-2 text-left"
                    >
                      <p className="font-serif text-sm leading-relaxed text-solvent/60" style={{ fontStyle: "italic" }}>
                        {complaint.description}
                      </p>
                      {canUpdate && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          className="mt-0.5 shrink-0 text-solvent/15 opacity-0 transition-all group-hover:opacity-100" aria-hidden="true">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </EditableField>
              </div>

              {/* ── Assignment & SLA info ── */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                  <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Assigned Team</span>
                  {complaint.assignedTeam ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-bathyal)", boxShadow: "0 0 6px rgba(46, 74, 74, 0.4)" }} />
                      <span className="text-sm text-solvent/70">{complaint.assignedTeam.name}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-solvent/30 italic">Not assigned</p>
                  )}
                </div>

                <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                  <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Assigned Staff</span>
                  {complaint.assignedStaff ? (
                    <p className="mt-1 text-sm text-solvent/70">{complaint.assignedStaff.name}</p>
                  ) : (
                    <p className="mt-1 text-sm text-solvent/30 italic">Not assigned</p>
                  )}
                </div>

                {complaint.slaFirstResponseDeadline && (
                  <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                    <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">SLA First Response</span>
                    <p className="mt-1 text-sm text-solvent/70 font-mono">
                      {new Date(complaint.slaFirstResponseDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {complaint.slaResolutionDeadline && (
                  <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                    <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">SLA Resolution</span>
                    <p className="mt-1 text-sm text-solvent/70 font-mono">
                      {new Date(complaint.slaResolutionDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {complaint.resolutionNotes && (
                  <div className="sm:col-span-2 rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                    <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Resolution Notes</span>
                    <p className="mt-1 font-serif text-sm italic leading-relaxed text-solvent/60">{complaint.resolutionNotes}</p>
                  </div>
                )}
              </div>

              {/* ── Timestamps footer ── */}
              <div className="mt-6 flex flex-wrap gap-4 text-[11px] tracking-wide text-solvent/20">
                <span className="font-mono">ID: {complaint.id}</span>
                <span>User: {complaint.userId}</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
