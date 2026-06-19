"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  description?: string;
}

interface ServerError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DESCRIPTION_MAX = 500;

// ── Particle Field ─────────────────────────────────────────────────────────

function ParticleField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: 1.2 + Math.random() * 2,
        delay: Math.random() * 8,
        duration: 5 + Math.random() * 7,
        dx: `${-30 + Math.random() * 60}px`,
      })),
    [],
  );

  if (!mounted) return null;

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
        style={{ background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Field Error ────────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">{message}</p>;
}

// ── Char Ring ──────────────────────────────────────────────────────────────

function CharRing({ current, max }: { current: number; max: number }) {
  const fraction = current / max;
  const circumference = 2 * Math.PI * 9;
  const offset = circumference - Math.min(fraction, 1) * circumference;
  const color = fraction > 0.95 ? "var(--color-magma)" : fraction > 0.8 ? "var(--color-cosmic-dust)" : "rgba(200, 230, 201, 0.5)";

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(200, 230, 201, 0.06)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), stroke 0.3s ease" }}
      />
    </svg>
  );
}

// ── Status Toggle ──────────────────────────────────────────────────────────

function StatusToggle({ value, onChange, disabled }: {
  value: "active" | "inactive"; onChange: (v: "active" | "inactive") => void; disabled: boolean;
}) {
  const isActive = value === "active";
  return (
    <div className="flex items-center gap-4">
      <span className="text-[13px] font-medium tracking-wide text-solvent/40 uppercase">Status</span>
      <button type="button" disabled={disabled}
        onClick={() => onChange(isActive ? "inactive" : "active")}
        className="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-500"
        style={{
          background: isActive ? "rgba(200, 230, 201, 0.15)" : "rgba(240, 244, 248, 0.04)",
          border: isActive ? "1px solid rgba(200, 230, 201, 0.25)" : "1px solid rgba(240, 244, 248, 0.08)",
          boxShadow: isActive ? "0 0 12px rgba(200, 230, 201, 0.08)" : "none",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        }}
        role="switch" aria-checked={isActive} aria-label="Product status"
      >
        <span className="absolute h-[18px] w-[18px] rounded-full transition-all duration-500"
          style={{
            left: isActive ? "20px" : "4px",
            background: isActive
              ? "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.9), rgba(167, 243, 208, 0.6))"
              : "radial-gradient(circle at 40% 35%, rgba(240, 244, 248, 0.3), rgba(240, 244, 248, 0.1))",
            boxShadow: isActive ? "0 0 8px rgba(200, 230, 201, 0.3)" : "none",
          }}
        />
      </button>
      <span className="text-[13px] font-medium tracking-wide transition-all duration-500"
        style={{ color: isActive ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.25)" }}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EDIT PRODUCT PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading } = auth;

  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [originalName, setOriginalName] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  // ── Fetch product data ───────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated || !productId) return;
    (async () => {
      setIsLoadingProduct(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/products/${productId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 404) { setLoadError("Product not found"); return; }
        if (!res.ok) throw new Error("Failed to fetch");
        const body = await res.json();
        const product = body.data;
        if (product) {
          setName(product.name);
          setDescription(product.description ?? "");
          setStatus(product.status);
          setOriginalName(product.name);
          setOriginalDescription(product.description ?? "");
          setTimeout(() => nameRef.current?.focus(), 100);
        }
      } catch { setLoadError("Failed to load product"); } finally { setIsLoadingProduct(false); }
    })();
  }, [productId, authLoading, isAuthenticated]);

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) errors.name = "Product name is required";
    else if (trimmedName.length > 100) errors.name = "Product name must be at most 100 characters";
    if (description.length > DESCRIPTION_MAX) errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
    return errors;
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const token = getAccessToken();
      const body: Record<string, unknown> = {};
      if (name.trim() !== originalName) body.name = name.trim();
      if (description !== originalDescription) body.description = description || null;
      // Always include status since it was provided
      body.status = status;

      const res = await fetch(`/api/v1/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 422 && data?.error?.details) {
          const serverFieldErrors: FieldErrors = {};
          for (const d of data.error.details) {
            if (d.field === "name") serverFieldErrors.name = d.message;
            if (d.field === "description") serverFieldErrors.description = d.message;
          }
          if (Object.keys(serverFieldErrors).length > 0) { setFieldErrors(serverFieldErrors); setIsSubmitting(false); return; }
        }
        setServerError({
          code: data?.error?.code ?? "UNKNOWN",
          message: data?.error?.message ?? (res.status === 409 ? "A product with this name already exists." : "Failed to update product."),
        });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch { setServerError({ code: "NETWORK_ERROR", message: "Unable to connect to the server." }); }
    finally { setIsSubmitting(false); }
  }

  // ── Field change ─────────────────────────────────────────────────────────
  function handleFieldChange(field: keyof FieldErrors, setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError(null);
    };
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login"); }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  // ── Success view ─────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
        <ParticleField />
        <div className="animate-slide-up flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="h-20 w-20 animate-float rounded-full"
              style={{ background: "radial-gradient(circle, rgba(167, 243, 208, 0.25), transparent 70%)", boxShadow: "0 0 60px rgba(167, 243, 208, 0.15)" }}
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <path d="M24 42l10 10 22-24" stroke="rgba(167, 243, 208, 0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 60, strokeDashoffset: 0, animation: "fade-in 0.6s ease-out 0.3s both" }} />
            </svg>
          </div>
          <div className="max-w-xs">
            <h1 className="font-serif text-3xl italic leading-tight text-aurora">Product updated.</h1>
            <p className="mt-3 text-sm leading-relaxed text-solvent/50">Changes to &ldquo;{name.trim()}&rdquo; have been saved.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => router.push(`/products/${productId}`)} className="btn-phosphor rounded-full px-6 py-3 text-sm">View product</button>
            <button onClick={() => router.push("/products")} className="btn-phosphor rounded-full px-6 py-3 text-sm"
              style={{ background: "linear-gradient(135deg, rgba(200, 230, 201, 0.18), rgba(200, 230, 201, 0.1))" }}>
              All products
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Loading / Error / Form ───────────────────────────────────────────────
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <ParticleField />

      <div className="pointer-events-none fixed top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[480px] animate-fade-in rounded-[2.5rem] px-6 py-10 sm:px-10 sm:py-14"
        style={{
          background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(200, 230, 201, 0.06)",
        }}
      >
        <div className="pointer-events-none absolute -top-px left-[20%] right-[20%] h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.15) 50%, transparent 100%)" }}
          aria-hidden="true"
        />

        {/* Back */}
        <button onClick={() => router.push(`/products/${productId}`)}
          className="mb-6 flex items-center gap-1.5 text-xs text-solvent/25 transition-colors hover:text-phosphor">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">Edit Product</h1>
          <p className="mt-1 text-sm text-solvent/40">Update the product details below.</p>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-magma">{loadError}</p>
            <button onClick={() => router.push("/products")} className="btn-phosphor rounded-full px-5 py-2 text-sm">Back to products</button>
          </div>
        ) : isLoadingProduct ? (
          <div className="flex justify-center py-12"><span className="spinner-ring" /></div>
        ) : (
          <>
            {/* Server error */}
            {serverError && (
              <div className="mb-6 animate-slide-up rounded-2xl px-4 py-3 text-sm"
                style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.12)", color: "var(--color-magma)" }} role="alert"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--color-magma)", boxShadow: "0 0 6px rgba(255, 111, 60, 0.4)" }}
                  />
                  <span>{serverError.message}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-7">
              {/* Name */}
              <div className="floating-label">
                <input ref={nameRef} id="name" type="text" autoComplete="off" placeholder=" "
                  value={name} onChange={handleFieldChange("name", setName)} disabled={isSubmitting}
                  className={`input-plasma w-full pb-2 pt-3 text-[15px] ${fieldErrors.name ? "error" : ""} ${name ? "filled" : ""}`}
                />
                <label htmlFor="name">Product name</label>
                <FieldError message={fieldErrors.name ?? ""} />
              </div>

              {/* Description */}
              <div>
                <div className="floating-label">
                  <textarea id="description" placeholder=" " rows={4} value={description}
                    onChange={handleFieldChange("description", setDescription)} disabled={isSubmitting}
                    className={`input-plasma w-full resize-none pb-2 pt-3 text-[15px] leading-relaxed ${fieldErrors.description ? "error" : ""} ${description ? "filled" : ""}`}
                    style={{ minHeight: 80 }}
                  />
                  <label htmlFor="description">Description <span className="text-solvent/20">(optional)</span></label>
                  <FieldError message={fieldErrors.description ?? ""} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button type="button" onClick={() => setDescription("")} disabled={isSubmitting || description.length === 0}
                    className="text-[11px] tracking-wider uppercase transition-all duration-300"
                    style={{ color: description.length > 0 ? "rgba(200, 230, 201, 0.4)" : "rgba(240, 244, 248, 0.08)", cursor: description.length > 0 && !isSubmitting ? "pointer" : "default" }}
                  >Clear</button>
                  <div className="flex items-center gap-2">
                    <CharRing current={description.length} max={DESCRIPTION_MAX} />
                    <span className="tabular-nums text-[11px] tracking-wider"
                      style={{ color: description.length > DESCRIPTION_MAX ? "var(--color-magma)" : description.length > DESCRIPTION_MAX * 0.8 ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.25)" }}
                    >{description.length}/{DESCRIPTION_MAX}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="pt-2"><StatusToggle value={status} onChange={setStatus} disabled={isSubmitting} /></div>

              {/* Submit */}
              <div className="pt-4">
                <button type="submit" disabled={isSubmitting}
                  className="btn-phosphor flex w-full items-center justify-center gap-3 rounded-full py-3.5 text-[15px]"
                >
                  {isSubmitting ? (
                    <><span className="spinner-ring" /><span className="text-phosphor/60">Saving changes...</span></>
                  ) : (
                    <span className="tracking-wide">Save changes</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-[80vmin] -translate-x-1/2"
        style={{ background: "radial-gradient(ellipse at center, rgba(200, 230, 201, 0.03) 0%, transparent 70%)", filter: "blur(40px)" }}
        aria-hidden="true"
      />
    </main>
  );
}
