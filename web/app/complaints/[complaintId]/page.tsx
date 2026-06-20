"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    | "open" | "assigned" | "in_progress" | "waiting_for_customer"
    | "resolved" | "reopened" | "closed" | "escalated";
  resolutionNotes: string | null;
  slaFirstResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

interface CommentItem {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  content: string;
  internal: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_NODES: Array<{
  id: string; label: string; color: string; bg: string; glow: string;
}> = [
  { id: "open",               label: "Open",               color: "var(--color-phosphor)",     bg: "rgba(200, 230, 201, 0.08)",   glow: "0 0 8px rgba(200, 230, 201, 0.3)" },
  { id: "assigned",           label: "Assigned",           color: "var(--color-aurora)",       bg: "rgba(167, 243, 208, 0.08)",  glow: "0 0 8px rgba(167, 243, 208, 0.3)" },
  { id: "in_progress",        label: "In Progress",        color: "var(--color-cosmic-dust)",  bg: "rgba(226, 196, 152, 0.08)",  glow: "0 0 8px rgba(226, 196, 152, 0.3)" },
  { id: "waiting_for_customer", label: "Waiting",          color: "rgba(240, 244, 248, 0.4)",  bg: "rgba(240, 244, 248, 0.04)",  glow: "none" },
  { id: "resolved",           label: "Resolved",           color: "var(--color-aurora)",       bg: "rgba(167, 243, 208, 0.08)",  glow: "0 0 8px rgba(167, 243, 208, 0.3)" },
  { id: "closed",             label: "Closed",             color: "rgba(240, 244, 248, 0.25)", bg: "rgba(240, 244, 248, 0.02)",  glow: "none" },
  { id: "reopened",           label: "Reopened",           color: "var(--color-magma)",        bg: "rgba(255, 111, 60, 0.08)",   glow: "0 0 8px rgba(255, 111, 60, 0.3)" },
  { id: "escalated",          label: "Escalated",          color: "var(--color-magma)",        bg: "rgba(255, 111, 60, 0.1)",    glow: "0 0 12px rgba(255, 111, 60, 0.4)" },
];

const STATUS_MAP = Object.fromEntries(STATUS_NODES.map((n) => [n.id, n]));

// ── Transition definitions for the UI ──────────────────────────────────────

interface UITransition {
  id: string;
  label: string;
  endpoint: string;
  remarksLabel: string;
  remarksRequired: boolean;
  remarksMaxLength: number;
  buttonClass: string;
}

const TRANSITIONS_BY_STATUS: Record<string, UITransition[]> = {
  open: [],
  assigned: [
    { id: "start", label: "Start Work", endpoint: "/status", remarksLabel: "", remarksRequired: false, remarksMaxLength: 0, buttonClass: "btn-work" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  in_progress: [
    { id: "wait", label: "Wait for Customer", endpoint: "/status", remarksLabel: "Information needed", remarksRequired: true, remarksMaxLength: 500, buttonClass: "btn-wait" },
    { id: "resolve", label: "Resolve", endpoint: "/resolve", remarksLabel: "Resolution summary", remarksRequired: true, remarksMaxLength: 2000, buttonClass: "btn-resolve" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  waiting_for_customer: [
    { id: "resume", label: "Resume Work", endpoint: "/status", remarksLabel: "", remarksRequired: false, remarksMaxLength: 0, buttonClass: "btn-work" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  resolved: [
    { id: "close", label: "Close", endpoint: "/close", remarksLabel: "Closure notes (optional)", remarksRequired: false, remarksMaxLength: 500, buttonClass: "btn-close" },
    { id: "reopen", label: "Reopen", endpoint: "/reopen", remarksLabel: "Reason for reopening", remarksRequired: true, remarksMaxLength: 500, buttonClass: "btn-reopen" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  closed: [
    { id: "reopen", label: "Reopen", endpoint: "/reopen", remarksLabel: "Reason for reopening", remarksRequired: true, remarksMaxLength: 500, buttonClass: "btn-reopen" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  reopened: [
    { id: "start", label: "Resume Work", endpoint: "/status", remarksLabel: "", remarksRequired: false, remarksMaxLength: 0, buttonClass: "btn-work" },
    { id: "escalate", label: "Escalate", endpoint: "/escalate", remarksLabel: "Escalation reason", remarksRequired: true, remarksMaxLength: 500, buttonClass: "" },
  ],
  escalated: [
    { id: "start", label: "Resume Work", endpoint: "/status", remarksLabel: "Resolution notes", remarksRequired: true, remarksMaxLength: 500, buttonClass: "btn-work" },
  ],
};

// ── Priority & Severity config ─────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE FIELD
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// STATUS FLOW DIAGRAM
// ═══════════════════════════════════════════════════════════════════════════

function StatusFlowDiagram({ currentStatus }: { currentStatus: string }) {
  const flowStatuses = ["open", "assigned", "in_progress", "resolved", "closed"];
  const flowIndex = flowStatuses.indexOf(currentStatus);

  const isWaiting = currentStatus === "waiting_for_customer";
  const isReopened = currentStatus === "reopened";
  const isEscalated = currentStatus === "escalated";

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" fill="none" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Status Workflow</span>
      </div>

      <div className="relative overflow-x-auto pb-2">
        <div className="flex items-center gap-0 min-w-max">
          {flowStatuses.map((s, idx) => {
            const sc = STATUS_MAP[s];
            const isCurrent = currentStatus === s;
            const isPast = flowIndex !== -1 && idx < flowIndex;
            const isFuture = flowIndex !== -1 && idx > flowIndex;

            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ${
                      isCurrent ? "animate-pulse-status" : ""
                    }`}
                    style={{
                      background: isCurrent
                        ? sc.bg
                        : isPast
                          ? "rgba(200, 230, 201, 0.06)"
                          : "rgba(10, 14, 20, 0.4)",
                      border: isCurrent
                        ? `1px solid ${sc.color}`
                        : isPast
                          ? "1px solid rgba(200, 230, 201, 0.1)"
                          : "1px solid rgba(200, 230, 201, 0.03)",
                      boxShadow: isCurrent ? sc.glow : "none",
                    }}
                  >
                    {isPast ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 6L9 17l-5-5" stroke="rgba(200, 230, 201, 0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span
                        className="text-[10px] font-bold tracking-wide uppercase"
                        style={{ color: isCurrent ? sc.color : "rgba(240, 244, 248, 0.15)" }}
                      >
                        {s === "in_progress" ? "IP" : s.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-medium tracking-wider uppercase whitespace-nowrap transition-colors duration-300"
                    style={{ color: isCurrent ? sc.color : "rgba(240, 244, 248, 0.15)" }}
                  >
                    {sc.label}
                  </span>
                </div>

                {idx < flowStatuses.length - 1 && (
                  <div
                    className={`mx-1.5 h-px w-6 transition-all duration-500 ${
                      isPast ? "opacity-60" : "opacity-20"
                    }`}
                    style={{
                      background: isPast
                        ? "linear-gradient(90deg, rgba(200, 230, 201, 0.4), rgba(200, 230, 201, 0.15))"
                        : "rgba(200, 230, 201, 0.08)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {(isWaiting || isReopened || isEscalated) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {isWaiting && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase"
                style={{ background: STATUS_MAP.waiting_for_customer.bg, border: "1px solid rgba(240, 244, 248, 0.06)", color: STATUS_MAP.waiting_for_customer.color }}
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: STATUS_MAP.waiting_for_customer.color }}
                />
                Waiting for Customer
              </span>
            )}
            {isReopened && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase"
                style={{ background: STATUS_MAP.reopened.bg, border: "1px solid rgba(255, 111, 60, 0.12)", color: STATUS_MAP.reopened.color }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_MAP.reopened.color, boxShadow: STATUS_MAP.reopened.glow }} />
                Reopened
              </div>
            )}
            {isEscalated && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium tracking-wide uppercase"
                style={{ background: STATUS_MAP.escalated.bg, border: "1px solid rgba(255, 111, 60, 0.15)", color: STATUS_MAP.escalated.color }}
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: STATUS_MAP.escalated.color, boxShadow: STATUS_MAP.escalated.glow }}
                />
                Escalated
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS TRANSITION MODAL
// ═══════════════════════════════════════════════════════════════════════════

function TransitionModal({
  transition, complaintId, ticketNumber, onClose, onSuccess,
}: {
  transition: UITransition;
  complaintId: string;
  ticketNumber: string;
  onClose: () => void;
  onSuccess: (data: Complaint) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const body: Record<string, unknown> = {};

      if (transition.endpoint === "/status") {
        body.transitionId = transition.id;
        if (transition.remarksRequired || remarks.trim()) {
          body.remarks = remarks.trim();
        }
      } else if (transition.endpoint === "/resolve") {
        body.resolutionSummary = remarks;
      } else if (transition.endpoint === "/close") {
        if (remarks.trim()) body.closureNotes = remarks.trim();
      } else if (transition.endpoint === "/reopen") {
        body.reason = remarks;
      } else if (transition.endpoint === "/escalate") {
        body.reason = remarks;
      }

      const res = await fetch(`/api/v1/complaints/${complaintId}${transition.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? "Transition failed");
        return;
      }

      onSuccess(json.data as Complaint);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md animate-slide-up rounded-[2rem] p-6"
        style={{
          background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
          border: "1px solid rgba(200, 230, 201, 0.08)",
          backdropFilter: "blur(32px)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-phosphor">{transition.label}</h3>
            <p className="text-[11px] text-solvent/30 font-mono mt-0.5">{ticketNumber}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-white/5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="rgba(240, 244, 248, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {(transition.remarksRequired || transition.remarksLabel) && (
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-medium tracking-wider text-solvent/30 uppercase">
              {transition.remarksLabel || "Remarks"}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={transition.remarksLabel || "Enter details..."}
              className="input-plasma w-full resize-none text-[13px] leading-relaxed"
              rows={4}
              autoFocus
              maxLength={transition.remarksMaxLength || 2000}
            />
            {transition.remarksMaxLength > 0 && (
              <div className="mt-1 text-right text-[10px] text-solvent/20">
                {remarks.length} / {transition.remarksMaxLength}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl px-3 py-2 text-xs"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)", color: "var(--color-magma)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
            style={{ background: "rgba(240, 244, 248, 0.04)", color: "rgba(240, 244, 248, 0.4)" }}
          >
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
            style={{
              background: "rgba(200, 230, 201, 0.12)",
              color: "var(--color-phosphor)",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-phosphor border-t-transparent" />
                Processing...
              </span>
            ) : (
              `Confirm ${transition.label}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EDITABLE FIELD
// ═══════════════════════════════════════════════════════════════════════════

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
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════════════════

function DeleteConfirmModal({
  complaintId, commentId, onClose, onDeleted,
}: {
  complaintId: string;
  commentId: string;
  onClose: () => void;
  onDeleted: (commentId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}/comments/${commentId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // We need complaintId from context — use the parent's
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to delete comment");
        return;
      }
      onDeleted(commentId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm animate-slide-up rounded-[2rem] p-6"
        style={{
          background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
          border: "1px solid rgba(255, 111, 60, 0.08)",
          backdropFilter: "blur(32px)",
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                stroke="rgba(255, 111, 60, 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-solvent/80">Delete comment</h3>
            <p className="text-[11px] text-solvent/30 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-3 py-2 text-xs"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)", color: "var(--color-magma)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
            style={{ background: "rgba(240, 244, 248, 0.04)", color: "rgba(240, 244, 248, 0.4)" }}
          >
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isDeleting}
            className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
            style={{
              background: "rgba(255, 111, 60, 0.12)",
              color: "var(--color-magma)",
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Deleting...
              </span>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACHMENT ITEM TYPE
// ═══════════════════════════════════════════════════════════════════════════

interface AttachmentItem {
  id: string;
  complaintId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTACHMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════

function AttachmentSection({
  complaintId,
  canUpload,
  currentUserId,
}: {
  complaintId: string;
  canUpload: boolean;
  currentUserId: string;
}) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch attachments ──────────────────────────────────────────────────
  const fetchAttachments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}/attachments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      const body = await res.json();
      setAttachments((body.data ?? []) as AttachmentItem[]);
    } catch {
      setError("Failed to load attachments");
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  // ── Upload handler ─────────────────────────────────────────────────────
  async function handleUpload(file: File) {
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setUploadError(json?.error?.message ?? "Failed to upload file");
        return;
      }

      const body = await res.json();
      const newAttachment = body.data as AttachmentItem;
      setAttachments((prev) => [newAttachment, ...prev]);
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  // ── File input change ──────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleUpload(files[0]);
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  }

  // ── Drag & drop handlers ───────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }

  // ── Delete handler ─────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(attachmentId: string) {
    setIsDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `/api/v1/complaints/${complaintId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch {
      // Silently fail — the list will refresh on next load
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  // ── Format file size ───────────────────────────────────────────────────
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Format timestamp ───────────────────────────────────────────────────
  function formatTime(iso: string): string {
    const dt = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ── File type icon helper ──────────────────────────────────────────────
  function getFileIcon(fileType: string): string {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.includes("pdf")) return "pdf";
    if (fileType.includes("wordprocessingml")) return "docx";
    return "generic";
  }

  return (
    <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(200, 230, 201, 0.06)" }}>
      {/* ── Header ── */}
      <div className="mb-5 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
            stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" fill="none" />
          <path d="M14 2v6h6m-5 6.5l-3 3-1.5-1.5"
            stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Attachments</span>
        {attachments.length > 0 && (
          <span className="text-[10px] text-solvent/15 font-mono">({attachments.length})</span>
        )}
      </div>

      {/* ── Upload error ── */}
      {uploadError && (
        <div className="mb-4 rounded-2xl px-3 py-2 text-xs"
          style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)", color: "var(--color-magma)" }}
          role="alert"
        >
          {uploadError}
        </div>
      )}

      {/* ── Upload drop zone ── */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mb-5 cursor-pointer rounded-2xl p-6 text-center transition-all duration-200"
          style={{
            background: dragOver
              ? "rgba(200, 230, 201, 0.08)"
              : "rgba(10, 14, 20, 0.4)",
            border: dragOver
              ? "2px dashed rgba(200, 230, 201, 0.3)"
              : "2px dashed rgba(200, 230, 201, 0.08)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-phosphor border-t-transparent" />
              <span className="text-xs text-phosphor/60">Uploading...</span>
            </div>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2" aria-hidden="true">
                <path d="M12 5v14M5 12l7-7 7 7"
                  stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs text-solvent/40">
                <span className="text-phosphor/60">Click</span> to upload or drop a file here
              </p>
              <p className="mt-1 text-[10px] text-solvent/20">
                JPG, PNG, PDF, DOCX &middot; Max 10 MB
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl p-3"
              style={{ background: "rgba(10, 14, 20, 0.2)", border: "1px solid rgba(200, 230, 201, 0.02)" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-bathyal/20" />
                <div className="flex-1">
                  <div className="h-3 w-2/3 rounded bg-bathyal/20 mb-1" />
                  <div className="h-2.5 w-1/3 rounded bg-bathyal/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.6)" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <p className="text-xs text-magma">{error}</p>
          <button onClick={fetchAttachments}
            className="rounded-full px-4 py-1.5 text-[11px] font-medium text-phosphor"
            style={{ background: "rgba(200, 230, 201, 0.08)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !error && attachments.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(200, 230, 201, 0.04)", border: "1px solid rgba(200, 230, 201, 0.04)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                stroke="rgba(200, 230, 201, 0.2)" strokeWidth="1.5" fill="none" />
              <path d="M14 2v6h6" stroke="rgba(200, 230, 201, 0.2)" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-xs text-solvent/30">No attachments yet</p>
        </div>
      )}

      {/* ── Attachment list ── */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((a) => {
            const isOwner = a.uploadedBy === currentUserId;
            const iconType = getFileIcon(a.fileType);

            return (
              <div
                key={a.id}
                className="group rounded-2xl p-3 transition-all duration-200 hover:scale-[1.005]"
                style={{
                  background: "rgba(10, 14, 20, 0.3)",
                  border: "1px solid rgba(200, 230, 201, 0.03)",
                }}
              >
                <div className="flex items-center gap-3">
                  {/* File icon */}
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:opacity-80"
                    style={{ background: "rgba(200, 230, 201, 0.06)" }}
                  >
                    {iconType === "image" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" fill="none" />
                        <circle cx="8.5" cy="8.5" r="1.5" fill="rgba(200, 230, 201, 0.4)" />
                        <path d="M21 15l-5-5L5 21" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : iconType === "pdf" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                          stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" fill="none" />
                        <path d="M14 2v6h6" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" />
                        <path d="M8 13h8M8 17h5" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                          stroke="rgba(167, 243, 208, 0.4)" strokeWidth="1.5" fill="none" />
                        <path d="M14 2v6h6" stroke="rgba(167, 243, 208, 0.4)" strokeWidth="1.5" />
                        <path d="M16 13H8M16 17H8" stroke="rgba(167, 243, 208, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </a>

                  {/* File info */}
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 transition-opacity hover:opacity-80"
                  >
                    <p className="truncate text-[13px] font-medium text-solvent/70">
                      {a.fileName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-solvent/25 font-mono">
                        {formatFileSize(a.fileSize)}
                      </span>
                      <span className="text-[10px] text-solvent/20">
                        {a.uploadedByName}
                      </span>
                      <span className="text-[10px] text-solvent/15">
                        {formatTime(a.createdAt)}
                      </span>
                    </div>
                  </a>

                  {/* Delete button (owner only) */}
                  {isOwner && (
                    <button
                      onClick={() => setDeletingId(a.id)}
                      disabled={isDeleting && deletingId === a.id}
                      className="shrink-0 rounded-full p-1.5 opacity-0 transition-all duration-200 hover:bg-white/5 group-hover:opacity-100 disabled:opacity-30"
                      title="Delete attachment"
                    >
                      {isDeleting && deletingId === a.id ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-solvent/30 border-t-transparent" />
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                            stroke="rgba(240, 244, 248, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingId(null); }}
        >
          <div className="w-full max-w-sm animate-slide-up rounded-[2rem] p-6"
            style={{
              background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
              border: "1px solid rgba(255, 111, 60, 0.08)",
              backdropFilter: "blur(32px)",
            }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                    stroke="rgba(255, 111, 60, 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-solvent/80">Delete attachment</h3>
                <p className="text-[11px] text-solvent/30 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setDeletingId(null)}
                className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
                style={{ background: "rgba(240, 244, 248, 0.04)", color: "rgba(240, 244, 248, 0.4)" }}
              >
                Cancel
              </button>
              <button onClick={() => handleDelete(deletingId)} disabled={isDeleting}
                className="flex-1 rounded-full px-4 py-2.5 text-xs font-medium transition-all"
                style={{
                  background: "rgba(255, 111, 60, 0.12)",
                  color: "var(--color-magma)",
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE SECTION
// ═══════════════════════════════════════════════════════════════════════════

function TimelineSection({
  complaintId,
}: {
  complaintId: string;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAccessToken();
      const res = await fetch(
        `/api/v1/complaints/${complaintId}/timeline?pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load timeline");
      const body = await res.json();
      setEvents(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  function getEventIcon(type: string) {
    switch (type) {
      case "status_change": return "🔄";
      case "assignment":    return "👤";
      case "comment":       return "💬";
      case "escalation":    return "⬆️";
      case "resolution":    return "✅";
      case "attachment":    return "📎";
      default:              return "📌";
    }
  }

  function getEventLabel(type: string, eventData: Record<string, string> | null = null) {
    switch (type) {
      case "status_change": return "Status Changed";
      case "assignment":    return "Assigned";
      case "comment":       return eventData?.action === "deleted" ? "Comment Deleted" : "Comment Added";
      case "escalation":    return "Escalated";
      case "resolution":    return "Resolved";
      case "attachment":    return eventData?.action === "deleted" ? "Attachment Deleted" : "Attachment Added";
      default:              return "Update";
    }
  }

  function getEventDescription(event: TimelineEvent): string {
    if (!event.eventData) return "";
    const d = event.eventData;
    switch (event.eventType) {
      case "status_change":
        return `${d.from ?? "?"} → ${d.to ?? "?"}`;
      case "assignment":
        return `Assigned to ${d.assignedTo ?? "?"}`;
      case "escalation":
        return d.reason ? `Reason: ${d.reason}` : "";
      case "resolution":
        return d.resolution ? `Resolution: ${d.resolution}` : "";
      case "attachment":
        return d.action === 'deleted' ? 'Attachment removed' : (d.fileName ?? '');
      case "comment":
        return d.action === 'deleted' ? 'Comment removed' : (d.commentId ? 'Comment added' : '');
      default:
        return "";
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-6 text-lg font-semibold text-white/90">Timeline</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-2 text-lg font-semibold text-white/90">Timeline</h3>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-2 text-lg font-semibold text-white/90">Timeline</h3>
        <p className="text-sm text-white/40">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="mb-6 text-lg font-semibold text-white/90">Timeline</h3>
      <div className="relative">
        <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-px bg-white/[0.06]" />
        <div className="space-y-5">
          {events.map((event) => (
            <div key={event.id} className="group relative flex items-start gap-3">
              <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs ring-1 ring-white/[0.08] transition-colors group-hover:bg-white/[0.10] group-hover:ring-white/[0.12]">
                {getEventIcon(event.eventType)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white/80">
                    {event.actorName}
                  </p>
                  <span className="shrink-0 text-xs text-white/30">
                    {formatTime(event.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-white/40">
                  {getEventLabel(event.eventType, event.eventData)}
                </p>
                {getEventDescription(event) && (
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">
                    {getEventDescription(event)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimelineEvent {
  id: string;
  complaintId: string;
  eventType: string;
  actorId: string;
  actorName: string;
  eventData: Record<string, string> | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════

function CommentSection({
  complaintId,
  canComment,
  currentUserId,
}: {
  complaintId: string;
  canComment: boolean;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch comments ──────────────────────────────────────────────────
  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `/api/v1/complaints/${complaintId}/comments?page=${pageNum}&pageSize=20`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const body = await res.json();
      const fetched = (body.data ?? []) as CommentItem[];
      setComments((prev) => (append ? [...prev, ...fetched] : fetched));
      setHasMore(body.meta ? pageNum < (body.meta.totalPages ?? 1) : false);
    } catch {
      setError("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  // ── Auto-poll new comments every 30s ────────────────────────────────
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      // Silently check for new comments (just page 1, don't disrupt current view)
      const token = getAccessToken();
      fetch(`/api/v1/complaints/${complaintId}/comments?page=1&pageSize=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((body) => {
          const fetched = (body.data ?? []) as CommentItem[];
          setComments((prev) => {
            // Merge: prepend any new comments not already in the list
            const existingIds = new Set(prev.map((c) => c.id));
            const newOnes = fetched.filter((c) => !existingIds.has(c.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev];
          });
        })
        .catch(() => {
          // Silent fail — don't disrupt the UI
        });
    }, 30000);

    return () => clearInterval(interval);
  }, [complaintId, error]);

  // ── Track newest comment ID for "New" indicator ────────────────────
  const [newestId, setNewestId] = useState<string | null>(null);

  useEffect(() => {
    if (comments.length > 0) {
      setNewestId(comments[0].id);
    }
  }, [comments.length]);

  // ── Load more ───────────────────────────────────────────────────────
  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchComments(next, true);
  }

  // ── Post a comment ──────────────────────────────────────────────────
  async function handlePost() {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsPosting(true);
    setPostError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: trimmed, internal: isInternal }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setPostError(json?.error?.message ?? "Failed to post comment");
        return;
      }

      const body = await res.json();
      const newComment = body.data as CommentItem;
      setComments((prev) => [newComment, ...prev]);
      setContent("");
      setIsInternal(false);
    } catch {
      setPostError("Network error. Please try again.");
    } finally {
      setIsPosting(false);
    }
  }

  // ── Format timestamp ────────────────────────────────────────────────
  function formatTime(iso: string): string {
    const dt = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;

    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // ── Get initials from name ──────────────────────────────────────────
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // ── Comment color from name (deterministic hue) ─────────────────────
  function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 40%, 55%)`;
  }

  // ── Edit handlers ─────────────────────────────────────────────────
  function handleStartEdit(c: CommentItem) {
    setEditingId(c.id);
    setEditContent(c.content);
    setEditError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditContent("");
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const trimmed = editContent.trim();
    if (!trimmed) return;

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(
        `/api/v1/complaints/${complaintId}/comments/${editingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: trimmed }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setEditError(json?.error?.message ?? "Failed to edit comment");
        return;
      }

      const body = await res.json();
      const updated = body.data as CommentItem;
      setComments((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      setEditingId(null);
      setEditContent("");
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  }

  // ── Delete handler ─────────────────────────────────────────────────
  function handleDeleteSuccess(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setDeletingId(null);
  }

  // ── Key handler for textarea ────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(200, 230, 201, 0.06)" }}>
      {/* ── Header ── */}
      <div className="mb-5 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
            stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Comments</span>
        {comments.length > 0 && (
          <span className="text-[10px] text-solvent/15 font-mono">({comments.length})</span>
        )}
        {/* Live indicator */}
        {!error && comments.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] font-mono tracking-wide text-solvent/20">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-phosphor/40" />
            Live
          </span>
        )}
      </div>

      {/* ── Post error ── */}
      {postError && (
        <div className="mb-4 rounded-2xl px-3 py-2 text-xs"
          style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)", color: "var(--color-magma)" }}
          role="alert"
        >
          {postError}
        </div>
      )}

      {/* ── Post form ── */}
      {canComment && (
        <div
          className="mb-6 rounded-2xl p-4 transition-all duration-200 focus-within:shadow-lg"
          style={{
            background: "rgba(10, 14, 20, 0.4)",
            border: "1px solid rgba(200, 230, 201, 0.05)",
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (Enter to post, Shift+Enter for new line)"
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-solvent/70 placeholder:text-solvent/20 focus:outline-none"
            rows={2}
            maxLength={2000}
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border border-solvent/20 bg-transparent accent-phosphor"
                />
                <span className="text-[10px] font-medium tracking-wider uppercase text-solvent/30">Internal</span>
              </label>
              {content.length > 0 && (
                <span className="text-[10px] text-solvent/20 font-mono">
                  {content.length}/2000
                </span>
              )}
            </div>
            <button
              onClick={handlePost}
              disabled={isPosting || !content.trim()}
              className="rounded-full px-4 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200 disabled:opacity-30"
              style={{
                background: content.trim() ? "rgba(200, 230, 201, 0.12)" : "rgba(240, 244, 248, 0.04)",
                color: content.trim() ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.2)",
              }}
            >
              {isPosting ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-phosphor border-t-transparent" />
                  Posting...
                </span>
              ) : (
                "Post"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {isLoading && comments.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl p-4"
              style={{ background: "rgba(10, 14, 20, 0.2)", border: "1px solid rgba(200, 230, 201, 0.02)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-bathyal/20" />
                <div className="h-3 w-20 rounded bg-bathyal/20" />
                <div className="h-2.5 w-12 rounded bg-bathyal/10" />
              </div>
              <div className="h-3 w-full rounded bg-bathyal/10 mb-1.5" />
              <div className="h-3 w-3/4 rounded bg-bathyal/10" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {error && !isLoading && comments.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.6)" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.3)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <p className="text-xs text-magma">{error}</p>
          <button onClick={() => fetchComments(1)}
            className="rounded-full px-4 py-1.5 text-[11px] font-medium text-phosphor"
            style={{ background: "rgba(200, 230, 201, 0.08)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !error && comments.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(200, 230, 201, 0.04)", border: "1px solid rgba(200, 230, 201, 0.04)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke="rgba(200, 230, 201, 0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-xs text-solvent/30">No comments yet</p>
          {canComment && (
            <p className="text-[11px] text-solvent/20 italic">Be the first to comment</p>
          )}
        </div>
      )}

      {/* ── Comment list ── */}
      {comments.length > 0 && (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const isEditing = editingId === c.id;
            const isOwner = c.userId === currentUserId;

            const isNewest = c.id === newestId && comments.length > 1;

            return (
              <div
                key={c.id}
                className={`group rounded-2xl p-4 transition-all duration-200 ${
                  isEditing ? "" : "hover:scale-[1.005]"
                } ${isNewest ? "animate-fade-in" : "animate-fade-in"}`}
                style={{
                  animationDelay: isNewest ? "0ms" : `${Math.random() * 100}ms`,
                  background: c.internal
                    ? "rgba(226, 196, 152, 0.04)"
                    : "rgba(10, 14, 20, 0.3)",
                  border: isEditing
                    ? "1px solid rgba(200, 230, 201, 0.12)"
                    : c.internal
                      ? "1px solid rgba(226, 196, 152, 0.06)"
                      : "1px solid rgba(200, 230, 201, 0.03)",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wide uppercase"
                    style={{
                      background: `${avatarColor(c.userName)}22`,
                      color: avatarColor(c.userName),
                      border: `1px solid ${avatarColor(c.userName)}33`,
                    }}
                  >
                    {getInitials(c.userName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Header row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[12px] font-medium text-solvent/70">
                        {c.userName}
                      </span>
                      <span className="text-[10px] text-solvent/20 font-mono">
                        {formatTime(c.createdAt)}
                      </span>
                      {c.isEdited && (
                        <span className="text-[9px] italic text-solvent/25 font-mono">(edited)</span>
                      )}
                      {c.internal && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide uppercase"
                          style={{
                            background: "rgba(226, 196, 152, 0.08)",
                            border: "1px solid rgba(226, 196, 152, 0.1)",
                            color: "var(--color-cosmic-dust)",
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                            />
                          </svg>
                          Internal
                        </span>
                      )}
                    </div>

                    {/* Content or Edit inline */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="w-full resize-none rounded-xl bg-bathyal/20 px-3 py-2 text-[13px] leading-relaxed text-solvent/70 placeholder:text-solvent/20 focus:outline-none focus:ring-1 focus:ring-phosphor/20"
                          rows={3}
                          maxLength={2000}
                          autoFocus
                        />
                        {editError && (
                          <p className="text-[11px] text-magma">{editError}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-solvent/20 font-mono">
                            {editContent.length}/2000
                          </span>
                          <div className="flex gap-1.5">
                            <button onClick={handleCancelEdit}
                              className="rounded-full px-3 py-1 text-[10px] font-medium text-solvent/40 transition-all hover:text-solvent/70"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit || !editContent.trim()}
                              className="rounded-full px-3 py-1 text-[10px] font-medium transition-all disabled:opacity-30"
                              style={{
                                background: "rgba(200, 230, 201, 0.12)",
                                color: "var(--color-phosphor)",
                              }}
                            >
                              {isSavingEdit ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-phosphor border-t-transparent" />
                                  Saving
                                </span>
                              ) : (
                                "Save"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] leading-relaxed text-solvent/50 whitespace-pre-wrap break-words">
                          {c.content}
                        </p>

                        {/* Action buttons */}
                        {isOwner && (
                          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="rounded-full p-1.5 transition-all hover:bg-white/5"
                              title="Edit comment"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                                  stroke="rgba(240, 244, 248, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeletingId(c.id)}
                              className="rounded-full p-1.5 transition-all hover:bg-white/5"
                              title="Delete comment"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                                  stroke="rgba(240, 244, 248, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Load more ── */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="rounded-full px-5 py-2 text-[11px] font-medium tracking-wide transition-all duration-200 disabled:opacity-30"
            style={{
              background: "rgba(200, 230, 201, 0.06)",
              border: "1px solid rgba(200, 230, 201, 0.06)",
              color: "var(--color-phosphor)",
            }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-phosphor border-t-transparent" />
                Loading...
              </span>
            ) : (
              "Load more comments"
            )}
          </button>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deletingId && (
        <DeleteConfirmModal
          complaintId={complaintId}
          commentId={deletingId}
          onClose={() => setDeletingId(null)}
          onDeleted={handleDeleteSuccess}
        />
      )}
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

  // Transition modal state
  const [activeTransition, setActiveTransition] = useState<UITransition | null>(null);
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.COMPLAINT_UPDATE]).allowed : false;
  const canUpdateStatus = profile ? checkPermissions(auth, [Permissions.COMPLAINT_UPDATE_STATUS]).allowed : false;
  const canResolve = profile ? checkPermissions(auth, [Permissions.COMPLAINT_RESOLVE]).allowed : false;
  const canClose = profile ? checkPermissions(auth, [Permissions.COMPLAINT_CLOSE]).allowed : false;
  const canReopen = profile ? checkPermissions(auth, [Permissions.COMPLAINT_REOPEN]).allowed : false;
  const canEscalate = profile ? checkPermissions(auth, [Permissions.COMPLAINT_ESCALATE]).allowed : false;
  const canComment = profile ? checkPermissions(auth, [Permissions.COMPLAINT_COMMENT]).allowed : false;
  const canUploadAttachments = profile ? checkPermissions(auth, [Permissions.COMPLAINT_ATTACHMENT]).allowed : false;

  // ── Fetch complaint ─────────────────────────────────────────────────────
  const fetchComplaint = useCallback(async () => {
    if (authLoading || !isAuthenticated || !complaintId) return;
    setIsFetching(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/complaints/${complaintId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 404) { setError("Complaint not found"); setComplaint(null); return; }
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      setComplaint(body.data ?? null);
    } catch {
      setError("Failed to load complaint");
    } finally {
      setIsFetching(false);
    }
  }, [complaintId, authLoading, isAuthenticated]);

  useEffect(() => { fetchComplaint(); }, [fetchComplaint]);

  // ── Init edit values when complaint loads ──────────────────────────────
  useEffect(() => {
    if (complaint) {
      setEditPriority(complaint.priority);
      setEditSeverity(complaint.severity);
      setEditDescription(complaint.description);
      setEditCategory(complaint.category);
    }
  }, [complaint]);

  // ── Save field update ──────────────────────────────────────────────────
  async function handleSaveField(field: string) {
    if (!complaint) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

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
    } finally {
      setIsSaving(false);
    }
  }

  // ── Cancel editing ────────────────────────────────────────────────────
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

  // ── Handle status transition success ──────────────────────────────────
  function handleTransitionSuccess(data: Complaint) {
    setComplaint(data);
    setActiveTransition(null);
    setTransitionSuccess(
      `Status updated to ${STATUS_MAP[data.currentStatus]?.label ?? data.currentStatus}`,
    );
    setTimeout(() => setTransitionSuccess(null), 4000);
  }

  // ── Check if user can perform a specific transition ───────────────────
  function canPerformTransition(t: UITransition): boolean {
    if (t.endpoint === "/status") return canUpdateStatus;
    if (t.endpoint === "/resolve") return canResolve;
    if (t.endpoint === "/close") return canClose;
    if (t.endpoint === "/reopen") return canReopen;
    if (t.endpoint === "/escalate") return canEscalate;
    return false;
  }

  // ── Auth gate ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  const sc = complaint ? (STATUS_MAP[complaint.currentStatus] ?? STATUS_MAP.open) : null;

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

        {/* ── Feedback toasts ── */}
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
        {transitionSuccess && (
          <div className="mb-4 animate-slide-up rounded-2xl px-4 py-2.5 text-sm"
            style={{ background: "rgba(200, 230, 201, 0.08)", border: "1px solid rgba(200, 230, 201, 0.12)", color: "var(--color-phosphor)" }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {transitionSuccess}
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
        ) : complaint && sc ? (
          <>
            {/* ── Status Flow Diagram ── */}
            <div className="mb-6 animate-fade-in rounded-[2rem] p-5"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                border: "1px solid rgba(200, 230, 201, 0.04)",
              }}
            >
              <StatusFlowDiagram currentStatus={complaint.currentStatus} />

              {/* ── Transition Action Buttons ── */}
              {(() => {
                const transitions = TRANSITIONS_BY_STATUS[complaint.currentStatus] ?? [];
                const available = transitions.filter(canPerformTransition);
                if (available.length === 0) return null;

                return (
                  <div className="mt-4 pt-4"
                    style={{ borderTop: "1px solid rgba(200, 230, 201, 0.04)" }}
                  >
                    <div className="mb-2 text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Actions</div>
                    <div className="flex flex-wrap gap-2">
                      {available.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTransition(t)}
                          className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: "rgba(200, 230, 201, 0.06)",
                            border: "1px solid rgba(200, 230, 201, 0.08)",
                            color: "var(--color-phosphor)",
                          }}
                        >
                          {t.id === "start" || t.id === "resume" ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M5 3l14 9-14 9V3z" fill="currentColor" opacity="0.6" />
                            </svg>
                          ) : t.id === "wait" ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
                              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                            </svg>
                          ) : t.id === "resolve" ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                            </svg>
                          ) : t.id === "close" ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                            </svg>
                          ) : t.id === "reopen" ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                            </svg>
                          )}
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

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
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
                      style={{ background: sc.bg, border: "1px solid rgba(240, 244, 248, 0.06)", color: sc.color }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.color, boxShadow: sc.glow }} />
                      {sc.label}
                    </span>
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

                <EditableField label="Category" value={complaint.category} isEditing={editField === "category"}>
                  {editField === "category" ? (
                    <div className="space-y-2">
                      <input type="text" value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="input-plasma w-full text-[14px]" autoFocus
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

              {/* ── Priority & Severity ── */}
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
                          className="mt-0.5 shrink-0 text-solvent/15 opacity-0 transition-all group-hover:opacity-100" aria-hidden="true">
                          <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </EditableField>
              </div>

              {/* ── Description ── */}
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

              {/* ── Comment Section ── */}
              {/* ── Attachment Section ── */}
              <AttachmentSection complaintId={complaintId} canUpload={canUploadAttachments} currentUserId={auth.user?.userId ?? ""} />

              {/* ── Timeline Section ── */}
              <TimelineSection complaintId={complaintId} />

              {/* ── Comment Section ── */}
              <CommentSection complaintId={complaintId} canComment={canComment} currentUserId={auth.user?.userId ?? ""} />
            </div>
          </>
        ) : null}
      </div>

      {/* ── Transition Modal ── */}
      {activeTransition && complaint && (
        <TransitionModal
          transition={activeTransition}
          complaintId={complaintId}
          ticketNumber={complaint.ticketNumber}
          onClose={() => setActiveTransition(null)}
          onSuccess={handleTransitionSuccess}
        />
      )}
    </main>
  );
}
