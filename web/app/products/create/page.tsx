"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  description?: string;
}

interface ServerError {
  code: string;
  message: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DESCRIPTION_MAX = 500;

// ── Particle Background ────────────────────────────────────────────────────

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 8,
        duration: 5 + Math.random() * 7,
        dx: `${-30 + Math.random() * 60}px`,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-phosphor"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            opacity: 0,
            animation: `particle-float ${p.duration}s ease-out ${p.delay}s infinite`,
            "--dx": p.dx,
            boxShadow: `0 0 ${p.size * 3}px rgba(200, 230, 201, 0.3)`,
          } as React.CSSProperties}
        />
      ))}
      {/* Aurora wash */}
      <div
        className="absolute -top-[40%] -right-[30%] h-[80%] w-[60%] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(167, 243, 208, 0.6) 0%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift 16s ease-in-out infinite",
        }}
      />
      {/* Bathyal wash */}
      <div
        className="absolute -bottom-[30%] -left-[20%] h-[70%] w-[50%] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(46, 74, 74, 0.5) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "drift 14s ease-in-out infinite reverse",
        }}
      />
      {/* Product glow — subtle Phosphor column */}
      <div
        className="absolute top-[10%] left-1/2 h-[80%] w-[40%] -translate-x-1/2 rounded-full opacity-[0.03]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200, 230, 201, 0.4) 0%, transparent 70%)",
          filter: "blur(120px)",
          animation: "drift 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ── Field Error ────────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">
      {message}
    </p>
  );
}

// ── Character Count Ring ───────────────────────────────────────────────────

function CharRing({ current, max }: { current: number; max: number }) {
  const fraction = current / max;
  const circumference = 2 * Math.PI * 9;
  const offset = circumference - Math.min(fraction, 1) * circumference;

  const color =
    fraction > 0.95
      ? "var(--color-magma)"
      : fraction > 0.8
        ? "var(--color-cosmic-dust)"
        : "rgba(200, 230, 201, 0.5)";

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="rgba(200, 230, 201, 0.06)"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 12 12)"
        style={{
          transition:
            "stroke-dashoffset 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), stroke 0.3s ease",
        }}
      />
    </svg>
  );
}

// ── Status Toggle ──────────────────────────────────────────────────────────

function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: "active" | "inactive";
  onChange: (v: "active" | "inactive") => void;
  disabled: boolean;
}) {
  const isActive = value === "active";

  return (
    <div className="flex items-center gap-4">
      <span className="text-[13px] font-medium tracking-wide text-solvent/40 uppercase">
        Status
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(isActive ? "inactive" : "active")}
        className="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-500"
        style={{
          background: isActive
            ? "rgba(200, 230, 201, 0.15)"
            : "rgba(240, 244, 248, 0.04)",
          border: isActive
            ? "1px solid rgba(200, 230, 201, 0.25)"
            : "1px solid rgba(240, 244, 248, 0.08)",
          boxShadow: isActive
            ? "0 0 12px rgba(200, 230, 201, 0.08), inset 0 0 8px rgba(200, 230, 201, 0.04)"
            : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
        role="switch"
        aria-checked={isActive}
        aria-label="Product status"
      >
        {/* Knob */}
        <span
          className="absolute h-[18px] w-[18px] rounded-full transition-all duration-500"
          style={{
            left: isActive ? "20px" : "4px",
            background: isActive
              ? "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.9), rgba(167, 243, 208, 0.6))"
              : "radial-gradient(circle at 40% 35%, rgba(240, 244, 248, 0.3), rgba(240, 244, 248, 0.1))",
            boxShadow: isActive
              ? "0 0 8px rgba(200, 230, 201, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
              : "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        />
      </button>
      <span
        className="text-[13px] font-medium tracking-wide transition-all duration-500"
        style={{
          color: isActive
            ? "var(--color-phosphor)"
            : "rgba(240, 244, 248, 0.25)",
        }}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

// ── Main Create Product Page ───────────────────────────────────────────────

export default function CreateProductPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = "Product name is required";
    } else if (trimmedName.length > 100) {
      errors.name = "Product name must be at most 100 characters";
    }

    if (description.length > DESCRIPTION_MAX) {
      errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
    }

    return errors;
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);

    try {
      const token = getAccessToken();

      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        // 422 — validation errors
        if (res.status === 422 && body?.error?.details) {
          const serverFieldErrors: FieldErrors = {};
          for (const d of body.error.details) {
            if (d.field === "name") serverFieldErrors.name = d.message;
            if (d.field === "description")
              serverFieldErrors.description = d.message;
          }
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
            setIsLoading(false);
            return;
          }
        }

        // Generic / conflict error
        setServerError({
          code: body?.error?.code ?? "UNKNOWN",
          message:
            body?.error?.message ??
            (res.status === 409
              ? "A product with this name already exists."
              : "Failed to create product. Please try again."),
        });
        setIsLoading(false);
        return;
      }

      // ── Success ──
      setIsSuccess(true);
    } catch {
      setServerError({
        code: "NETWORK_ERROR",
        message:
          "Unable to connect to the server. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Field change handlers ───────────────────────────────────────────────

  function handleFieldChange(
    field: keyof FieldErrors,
    setter: (v: string) => void,
  ) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (serverError) setServerError(null);
    };
  }

  // ── Success View ────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
        <ParticleField />

        {/* Success halo */}
        <div className="animate-slide-up flex flex-col items-center gap-8 text-center">
          {/* Aurora glow orb */}
          <div className="relative">
            <div
              className="h-20 w-20 animate-float rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(167, 243, 208, 0.25), transparent 70%)",
                boxShadow:
                  "0 0 60px rgba(167, 243, 208, 0.15), 0 0 120px rgba(167, 243, 208, 0.06)",
              }}
            />
            {/* Check arc */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M24 42l10 10 22-24"
                stroke="rgba(167, 243, 208, 0.8)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 60,
                  strokeDashoffset: 0,
                  animation: "fade-in 0.6s ease-out 0.3s both",
                }}
              />
            </svg>
          </div>

          <div className="max-w-xs">
            <h1 className="font-serif text-3xl italic leading-tight text-aurora">
              Product created.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-solvent/50">
              &ldquo;{name.trim()}&rdquo; is now live in your product catalog.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/products/create")}
              className="btn-phosphor rounded-full px-6 py-3 text-sm"
            >
              Create another
            </button>
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="btn-phosphor rounded-full px-6 py-3 text-sm"
              style={{
                background:
                  "linear-gradient(135deg, rgba(200, 230, 201, 0.18), rgba(200, 230, 201, 0.1))",
              }}
            >
              View all products
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Create Product Form ─────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <ParticleField />

      {/* ── Background ambient orbs ── */}
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* ── Form Halo (container) — never a rectangle ── */}
      <div
        className="relative w-full max-w-[480px] animate-fade-in rounded-[2.5rem] px-6 py-10 sm:px-10 sm:py-14"
        style={{
          background:
            "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
          backdropFilter: "blur(32px) saturate(0.8)",
          WebkitBackdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(200, 230, 201, 0.06)",
          boxShadow:
            "0 0 40px rgba(200, 230, 201, 0.03), inset 0 1px 0 rgba(200, 230, 201, 0.04)",
        }}
      >
        {/* Decorative top arc */}
        <div
          className="pointer-events-none absolute -top-px left-[20%] right-[20%] h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.15) 50%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* ── Header ── */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">
            New Product
          </h1>
          <p className="mt-1 text-sm text-solvent/40">
            Define a new product in your catalog. It will be available for
            complaint routing and SLA configuration.
          </p>
        </div>

        {/* ── Server Error Banner ── */}
        {serverError && (
          <div
            className="mb-6 animate-slide-up rounded-2xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255, 111, 60, 0.08)",
              border: "1px solid rgba(255, 111, 60, 0.12)",
              color: "var(--color-magma)",
            }}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: "var(--color-magma)",
                  boxShadow: "0 0 6px rgba(255, 111, 60, 0.4)",
                }}
              />
              <span>{serverError.message}</span>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          {/* Product Name */}
          <div className="floating-label">
            <input
              ref={nameRef}
              id="name"
              type="text"
              autoComplete="off"
              placeholder=" "
              value={name}
              onChange={handleFieldChange("name", setName)}
              disabled={isLoading}
              className={`input-plasma w-full pb-2 pt-3 text-[15px] ${
                fieldErrors.name ? "error" : ""
              } ${name ? "filled" : ""}`}
            />
            <label htmlFor="name">Product name</label>
            <FieldError message={fieldErrors.name ?? ""} />
          </div>

          {/* Description */}
          <div>
            <div className="floating-label">
              <textarea
                id="description"
                placeholder=" "
                rows={4}
                value={description}
                onChange={handleFieldChange("description", setDescription)}
                disabled={isLoading}
                className={`input-plasma w-full resize-none pb-2 pt-3 text-[15px] leading-relaxed ${
                  fieldErrors.description ? "error" : ""
                } ${description ? "filled" : ""}`}
                style={{ minHeight: 80 }}
              />
              <label htmlFor="description">
                Description{" "}
                <span className="text-solvent/20">(optional)</span>
              </label>
              <FieldError message={fieldErrors.description ?? ""} />
            </div>

            {/* Bottom row: char count + clear */}
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDescription("")}
                disabled={isLoading || description.length === 0}
                className="text-[11px] tracking-wider uppercase transition-all duration-300"
                style={{
                  color:
                    description.length > 0
                      ? "rgba(200, 230, 201, 0.4)"
                      : "rgba(240, 244, 248, 0.08)",
                  cursor:
                    description.length > 0 && !isLoading
                      ? "pointer"
                      : "default",
                }}
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <CharRing current={description.length} max={DESCRIPTION_MAX} />
                <span
                  className="tabular-nums text-[11px] tracking-wider"
                  style={{
                    color:
                      description.length > DESCRIPTION_MAX
                        ? "var(--color-magma)"
                        : description.length > DESCRIPTION_MAX * 0.8
                          ? "var(--color-cosmic-dust)"
                          : "rgba(240, 244, 248, 0.25)",
                  }}
                >
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="pt-2">
            <StatusToggle
              value={status}
              onChange={setStatus}
              disabled={isLoading}
            />
          </div>

          {/* ── Submit ── */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-phosphor flex w-full items-center justify-center gap-3 rounded-full py-3.5 text-[15px]"
            >
              {isLoading ? (
                <>
                  <span className="spinner-ring" />
                  <span className="text-phosphor/60">Creating product...</span>
                </>
              ) : (
                <span className="tracking-wide">Create product</span>
              )}
            </button>
          </div>
        </form>

        {/* ── Footer link ── */}
        <p className="mt-8 text-center text-sm text-solvent/30">
          Changed your mind?{" "}
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="font-medium text-phosphor/60 transition-colors hover:text-phosphor"
          >
            Back to products
          </button>
        </p>
      </div>

      {/* ── Ambient phosphor ground glow ── */}
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-[80vmin] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200, 230, 201, 0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
        aria-hidden="true"
      />
    </main>
  );
}
