"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, useAuth } from "@/hooks/useAuth";
import AppNavigation from "@/components/AppNavigation";

// -- Types ------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
}

interface FieldErrors {
  productId?: string;
  category?: string;
  priority?: string;
  severity?: string;
  description?: string;
}

interface ServerError {
  code: string;
  message: string;
}

// -- Constants --------------------------------------------------------------

const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 5000;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "rgba(240, 244, 248, 0.3)" },
  { value: "medium", label: "Medium", color: "var(--color-cosmic-dust)" },
  { value: "high", label: "High", color: "var(--color-magma)" },
  { value: "critical", label: "Critical", color: "var(--color-magma)" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor", color: "rgba(240, 244, 248, 0.3)" },
  { value: "major", label: "Major", color: "var(--color-cosmic-dust)" },
  { value: "critical", label: "Critical", color: "var(--color-magma)" },
] as const;

const CATEGORIES = [
  "Login Issue",
  "Billing Problem",
  "Account Access",
  "Feature Request",
  "Performance Issue",
  "Security Concern",
  "Data Loss",
  "Integration Error",
  "UI/UX Feedback",
  "Other",
] as const;

// -- Particle Background ----------------------------------------------------

function ParticleField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { /* eslint-disable react-hooks/set-state-in-effect */ setMounted(true); /* eslint-enable react-hooks/set-state-in-effect */ }, []);

  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
      size: 1.5 + Math.random() * 2.5, delay: Math.random() * 8,
      duration: 5 + Math.random() * 7, dx: `${-30 + Math.random() * 60}px`,
    }))
  );

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full bg-phosphor"
          style={{
            width: p.size, height: p.size, left: p.x, top: p.y, opacity: 0,
            animation: `particle-float ${p.duration}s ease-out ${p.delay}s infinite`,
            "--dx": p.dx, boxShadow: `0 0 ${p.size * 3}px rgba(200, 230, 201, 0.3)`,
          } as React.CSSProperties}
        />
      ))}
      <div className="absolute -top-[40%] -right-[30%] h-[80%] w-[60%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(200, 230, 201, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
      <div className="absolute -bottom-[30%] -left-[20%] h-[70%] w-[50%] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(ellipse, rgba(46, 74, 74, 0.5) 0%, transparent 70%)", filter: "blur(90px)", animation: "drift 14s ease-in-out infinite reverse" }}
      />
    </div>
  );
}

// -- Field Error ------------------------------------------------------------

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">{message}</p>;
}

// -- Character Count Ring ---------------------------------------------------

function CharRing({ current, max }: { current: number; max: number }) {
  const fraction = current / max;
  const circumference = 2 * Math.PI * 9;
  const offset = circumference - Math.min(fraction, 1) * circumference;
  const color = fraction > 0.95 ? "var(--color-magma)" : fraction > 0.8 ? "var(--color-cosmic-dust)" : "rgba(200, 230, 201, 0.5)";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(200, 230, 201, 0.06)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), stroke 0.3s ease" }}
      />
    </svg>
  );
}

// -- Priority Selector ------------------------------------------------------

function PrioritySelector({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-medium tracking-wide text-solvent/40 uppercase">Priority</span>
      <div className="flex gap-1.5">
        {PRIORITY_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} disabled={disabled}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide uppercase transition-all duration-300"
            style={{
              background: value === opt.value ? "rgba(200, 230, 201, 0.08)" : "rgba(240, 244, 248, 0.02)",
              border: value === opt.value ? "1px solid rgba(200, 230, 201, 0.15)" : "1px solid rgba(240, 244, 248, 0.04)",
              color: value === opt.value ? opt.color : "rgba(240, 244, 248, 0.25)",
            }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  );
}

// -- Severity Selector ------------------------------------------------------

function SeveritySelector({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-medium tracking-wide text-solvent/40 uppercase">Severity</span>
      <div className="flex gap-1.5">
        {SEVERITY_OPTIONS.map((opt) => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} disabled={disabled}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide uppercase transition-all duration-300"
            style={{
              background: value === opt.value ? "rgba(255, 111, 60, 0.08)" : "rgba(240, 244, 248, 0.02)",
              border: value === opt.value ? "1px solid rgba(255, 111, 60, 0.15)" : "1px solid rgba(240, 244, 248, 0.04)",
              color: value === opt.value ? opt.color : "rgba(240, 244, 248, 0.25)",
            }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  );
}

// -- Main Create Complaint Page ---------------------------------------------

export default function CreateComplaintPage() {
  const router = useRouter();
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading } = auth;

  // Form state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [severity, setSeverity] = useState("minor");
  const [description, setDescription] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const productRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // -- Fetch products --------------------------------------------------------
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/v1/products?pageSize=100", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          setProducts(body.data ?? []);
        }
      } catch { /* silent */ } finally { setIsLoadingProducts(false); }
    })();
  }, [authLoading, isAuthenticated]);

  // Close product dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          productRef.current && !productRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -- Validation ----------------------------------------------------------

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!productId) errors.productId = "Product is required";
    const cat = category === "__custom__" ? customCategory.trim() : category;
    if (!cat) errors.category = "Category is required";
    else if (cat.length > 100) errors.category = "Category must be at most 100 characters";
    if (!priority) errors.priority = "Priority is required";
    if (!severity) errors.severity = "Severity is required";
    const desc = description.trim();
    if (desc.length < DESCRIPTION_MIN) errors.description = `Description must be at least ${DESCRIPTION_MIN} characters (${DESCRIPTION_MIN - desc.length} more)`;
    else if (desc.length > DESCRIPTION_MAX) errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
    return errors;
  }

  // -- Submit --------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    const catValue = category === "__custom__" ? customCategory.trim() : category;

    try {
      const token = getAccessToken();
      const res = await fetch("/api/v1/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId,
          category: catValue,
          priority,
          severity,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 422 && body?.error?.details) {
          const serverFieldErrors: FieldErrors = {};
          for (const d of body.error.details) {
            if (d.field === "productId") serverFieldErrors.productId = d.message;
            if (d.field === "category") serverFieldErrors.category = d.message;
            if (d.field === "priority") serverFieldErrors.priority = d.message;
            if (d.field === "severity") serverFieldErrors.severity = d.message;
            if (d.field === "description") serverFieldErrors.description = d.message;
          }
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
            setIsSubmitting(false);
            return;
          }
        }
        setServerError({
          code: body?.error?.code ?? "UNKNOWN",
          message: body?.error?.message ?? (res.status === 404 ? "Product or category not found." : "Failed to create complaint. Please try again."),
        });
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setTicketNumber(data?.data?.ticketNumber ?? "");
      setIsSuccess(true);
    } catch {
      setServerError({ code: "NETWORK_ERROR", message: "Unable to connect to the server. Please check your connection." });
    } finally { setIsSubmitting(false); }
  }

  // -- Field change handlers -----------------------------------------------

  function handleFieldChange(field: keyof FieldErrors, setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setter(e.target.value);
      if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError(null);
    };
  }

  // -- Auth gate ------------------------------------------------------------
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push("/login"); }, [authLoading, isAuthenticated, router]);

  if (authLoading) return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  if (!isAuthenticated) return null;

  // -- Success View ---------------------------------------------------------

  if (isSuccess) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
        <ParticleField />
        <div className="animate-slide-up flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="h-20 w-20 animate-float rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(200, 230, 201, 0.25), transparent 70%)",
                boxShadow: "0 0 60px rgba(200, 230, 201, 0.15), 0 0 120px rgba(200, 230, 201, 0.06)",
              }}
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <path d="M24 42l10 10 22-24" stroke="rgba(200, 230, 201, 0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 60, strokeDashoffset: 0, animation: "fade-in 0.6s ease-out 0.3s both" }}
              />
            </svg>
          </div>
          <div className="max-w-sm">
            <h1 className="font-serif text-3xl italic leading-tight text-phosphor">Complaint created.</h1>
            {ticketNumber && (
              <p className="mt-2 font-mono text-lg text-aurora">{ticketNumber}</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-solvent/50">
              Your complaint has been submitted and is being processed.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => router.push("/complaints/create")}
              className="btn-phosphor rounded-full px-6 py-3 text-sm"
            >Create another</button>
            <button type="button" onClick={() => router.push("/complaints")}
              className="btn-phosphor rounded-full px-6 py-3 text-sm"
              style={{ background: "linear-gradient(135deg, rgba(200, 230, 201, 0.18), rgba(200, 230, 201, 0.1))" }}
            >View all complaints</button>
          </div>
        </div>
      </main>
    );
  }

  // -- Create Complaint Form ------------------------------------------------

  const catValue = category === "__custom__" ? customCategory.trim() : category;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-20">
      <AppNavigation />
      <ParticleField />

      <div className="pointer-events-none fixed top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[520px] animate-fade-in rounded-[2.5rem] px-6 py-10 sm:px-10 sm:py-14"
        style={{
          background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
          backdropFilter: "blur(32px) saturate(0.8)",
          WebkitBackdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(200, 230, 201, 0.06)",
          boxShadow: "0 0 40px rgba(200, 230, 201, 0.03), inset 0 1px 0 rgba(200, 230, 201, 0.04)",
        }}
      >
        <div className="pointer-events-none absolute -top-px left-[20%] right-[20%] h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.15) 50%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">New Complaint</h1>
          <p className="mt-1 text-sm text-solvent/40">Submit a new complaint for resolution.</p>
        </div>

        {serverError && (
          <div className="mb-6 animate-slide-up rounded-2xl px-4 py-3 text-sm"
            style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.12)", color: "var(--color-magma)" }}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--color-magma)", boxShadow: "0 0 6px rgba(255, 111, 60, 0.4)" }}
              />
              <span>{serverError.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* -- Product Select -- */}
          <div className="floating-label">
            <button
              ref={productRef}
              type="button"
              onClick={() => setShowProductDropdown((p) => !p)}
              disabled={isSubmitting || isLoadingProducts}
              className={`input-plasma w-full pb-2 pt-3 text-[15px] text-left ${fieldErrors.productId ? "error" : ""} ${productId ? "filled" : ""}`}
              style={{ borderBottom: "1.5px solid var(--color-bathyal)", cursor: "pointer" }}
            >
              {productId ? products.find((p) => p.id === productId)?.name ?? "Select a product" : ""}
            </button>
            <label htmlFor="productId">{isLoadingProducts ? "Loading products..." : "Select product"}</label>
            <span className="pointer-events-none absolute right-0 bottom-2 text-solvent/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>

            {/* Product dropdown */}
            {showProductDropdown && products.length > 0 && (
              <div ref={dropdownRef}
                className="absolute left-0 right-0 top-full z-10 mt-1 rounded-2xl overflow-hidden animate-fade-in"
                style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))", backdropFilter: "blur(32px)", border: "1px solid rgba(200, 230, 201, 0.06)" }}
              >
                {products.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setProductId(p.id); setShowProductDropdown(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-solvent/70 transition-all hover:bg-phosphor/5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: productId === p.id ? "rgba(200, 230, 201, 0.15)" : "rgba(200, 230, 201, 0.05)" }}
                    >
                      <span className="text-[10px] font-medium text-phosphor">{p.name.charAt(0)}</span>
                    </span>
                    <span className={`${productId === p.id ? "text-phosphor" : "text-solvent/70"}`}>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {isLoadingProducts && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-2xl p-4 text-center animate-fade-in"
                style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))", border: "1px solid rgba(200, 230, 201, 0.06)" }}
              >
                <span className="inline-block h-4 w-4 animate-spin rounded-full border border-phosphor border-t-transparent" />
              </div>
            )}
            <FieldError message={fieldErrors.productId ?? ""} />
          </div>

          {/* -- Category -- */}
          <div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => { setCategory(cat); setCustomCategory(""); }}
                  disabled={isSubmitting}
                  className="rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-300"
                  style={{
                    background: category === cat ? "rgba(200, 230, 201, 0.08)" : "rgba(240, 244, 248, 0.02)",
                    border: category === cat ? "1px solid rgba(200, 230, 201, 0.15)" : "1px solid rgba(240, 244, 248, 0.04)",
                    color: category === cat ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.4)",
                  }}
                >{cat}</button>
              ))}
              <button key="__custom__" type="button" onClick={() => setCategory("__custom__")}
                disabled={isSubmitting}
                className="rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-300"
                style={{
                  background: category === "__custom__" ? "rgba(200, 230, 201, 0.08)" : "rgba(240, 244, 248, 0.02)",
                  border: category === "__custom__" ? "1px solid rgba(200, 230, 201, 0.08)" : "1px dashed rgba(240, 244, 248, 0.12)",
                  color: category === "__custom__" ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.3)",
                }}
              >+ Custom</button>
            </div>
            {category === "__custom__" && (
              <div className="floating-label mt-3 animate-slide-up">
                <input id="customCategory" type="text" placeholder=" " autoFocus
                  value={customCategory} onChange={handleFieldChange("category", setCustomCategory)}
                  disabled={isSubmitting}
                  className={`input-plasma w-full pb-2 pt-3 text-[14px] ${fieldErrors.category ? "error" : ""} ${customCategory ? "filled" : ""}`}
                />
                <label htmlFor="customCategory">Custom category name</label>
              </div>
            )}
            <FieldError message={fieldErrors.category ?? ""} />
          </div>

          {/* -- Priority + Severity row -- */}
          <div className="flex flex-wrap gap-6">
            <PrioritySelector value={priority} onChange={setPriority} disabled={isSubmitting} />
            <SeveritySelector value={severity} onChange={setSeverity} disabled={isSubmitting} />
          </div>

          {/* -- Description -- */}
          <div>
            <div className="floating-label">
              <textarea id="description" placeholder=" " rows={5}
                value={description} onChange={handleFieldChange("description", setDescription)}
                disabled={isSubmitting}
                className={`input-plasma w-full resize-none pb-2 pt-3 text-[15px] leading-relaxed ${fieldErrors.description ? "error" : ""} ${description ? "filled" : ""}`}
                style={{ minHeight: 100 }}
              />
              <label htmlFor="description">Describe the issue in detail</label>
              <FieldError message={fieldErrors.description ?? ""} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CharRing current={description.length} max={DESCRIPTION_MAX} />
                <span className="tabular-nums text-[11px] tracking-wider"
                  style={{
                    color: description.length > DESCRIPTION_MAX ? "var(--color-magma)" : description.length > DESCRIPTION_MAX * 0.8 ? "var(--color-cosmic-dust)" : "rgba(240, 244, 248, 0.25)",
                  }}
                >{description.length}/{DESCRIPTION_MAX}</span>
              </div>
              {description.length < DESCRIPTION_MIN && description.length > 0 && (
                <span className="text-[11px] text-solvent/20">{DESCRIPTION_MIN - description.length} more needed</span>
              )}
            </div>
          </div>

          {/* -- Submit -- */}
          <div className="pt-4">
            <button type="submit" disabled={isSubmitting}
              className="btn-phosphor flex w-full items-center justify-center gap-3 rounded-full py-3.5 text-[15px]"
            >
              {isSubmitting ? (
                <><span className="spinner-ring" /><span className="text-phosphor/60">Submitting complaint...</span></>
              ) : (
                <span className="tracking-wide">Submit complaint</span>
              )}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-solvent/30">
          Changed your mind?{" "}
          <button type="button" onClick={() => router.push("/complaints")}
            className="font-medium text-phosphor/60 transition-colors hover:text-phosphor"
          >Back to complaints</button>
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 h-32 w-[80vmin] -translate-x-1/2"
        style={{ background: "radial-gradient(ellipse at center, rgba(200, 230, 201, 0.03) 0%, transparent 70%)", filter: "blur(40px)" }}
        aria-hidden="true"
      />
    </main>
  );
}
