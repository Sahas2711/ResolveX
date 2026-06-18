"use client";

import { useState, useCallback, useMemo, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

// ── Constants ──────────────────────────────────────────────────────────────

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "Digit (0–9)", test: (v: string) => /\d/.test(v) },
  { label: "Special character (!@#$%^&*)", test: (v: string) => /[!@#$%^&*]/.test(v) },
] as const;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface ServerError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string; constraint: string }>;
}

// ── Particle Background Component ─────────────────────────────────────────

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
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
    </div>
  );
}

// ── Orbital Progress Ring ──────────────────────────────────────────────────

function OrbitalRing({ progress }: { progress: number }) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - progress * circumference;

  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      className="animate-fade-in"
      aria-hidden="true"
    >
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="rgba(200, 230, 201, 0.08)"
        strokeWidth="1.5"
      />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="rgba(200, 230, 201, 0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 22 22)"
        style={{
          transition: "stroke-dashoffset 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      />
    </svg>
  );
}

// ── Password Strength Indicator ────────────────────────────────────────────

function PasswordStrength({ value }: { value: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const total = PASSWORD_RULES.length;
  const fraction = passed / total;

  const label =
    fraction === 0
      ? ""
      : fraction <= 0.4
        ? "Weak"
        : fraction <= 0.8
          ? "Moderate"
          : "Strong";

  const color =
    fraction <= 0.4
      ? "var(--color-magma)"
      : fraction <= 0.8
        ? "var(--color-cosmic-dust)"
        : "var(--color-aurora)";

  return (
    <div
      className="animate-slide-up overflow-hidden transition-all duration-300"
      style={{
        maxHeight: value.length > 0 ? 180 : 0,
        opacity: value.length > 0 ? 1 : 0,
      }}
    >
      {/* Strength meter — a luminous line, never a bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-bathyal/40">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${fraction * 100}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color.replace(")", ", 0.3)").replace("rgb", "rgba")}`,
            }}
          />
        </div>
        {label && (
          <span
            className="text-[11px] font-medium tracking-wider uppercase"
            style={{ color }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Rule checklist */}
      <ul className="mt-2 space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.label}
              className="flex items-center gap-2 text-[12px] transition-all duration-300"
              style={{
                color: ok
                  ? "rgba(167, 243, 208, 0.7)"
                  : "rgba(240, 244, 248, 0.25)",
              }}
            >
              <span
                className="inline-block rounded-full transition-all duration-300"
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: ok ? "var(--color-aurora)" : "transparent",
                  border: ok ? "none" : "1px solid rgba(240, 244, 248, 0.15)",
                  boxShadow: ok
                    ? "0 0 6px rgba(167, 243, 208, 0.4)"
                    : "none",
                }}
              />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Field-level error ─────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">
      {message}
    </p>
  );
}

// ── Main Registration Page ─────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Password strength progress (for orbital ring)
  const passwordStrength =
    password.length === 0
      ? 0
      : PASSWORD_RULES.filter((r) => r.test(password)).length / PASSWORD_RULES.length;

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = "Name is required";
    } else if (trimmedName.length > 150) {
      errors.name = "Name must be at most 150 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    } else if (email.length > 255) {
      errors.email = "Email must be at most 255 characters";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (password.length > 128) {
      errors.password = "Password must be at most 128 characters";
    } else {
      const missingRules = PASSWORD_RULES.filter((r) => !r.test(password));
      if (missingRules.length > 0) {
        errors.password = `Missing: ${missingRules.map((r) => r.label.toLowerCase()).join(", ")}`;
      }
    }

    return errors;
  }, [name, email, password]);

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        // 422 — validation errors from server
        if (res.status === 422 && body?.error?.details) {
          const serverFieldErrors: FieldErrors = {};
          for (const d of body.error.details) {
            if (d.field === "name") serverFieldErrors.name = d.message;
            if (d.field === "email") serverFieldErrors.email = d.message;
            if (d.field === "password") serverFieldErrors.password = d.message;
          }
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
            setIsLoading(false);
            return;
          }
        }

        // Generic server error
        setServerError({
          code: body?.error?.code ?? "UNKNOWN",
          message:
            body?.error?.message ??
            (res.status === 409
              ? "A user with this email already exists."
              : "Registration failed. Please try again."),
        });
        setIsLoading(false);
        return;
      }

      // ── Success ──
      setIsSuccess(true);
    } catch {
      setServerError({
        code: "NETWORK_ERROR",
        message: "Unable to connect to the server. Please check your connection.",
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
    return (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      // Clear error as user types
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
                background: "radial-gradient(circle, rgba(167, 243, 208, 0.25), transparent 70%)",
                boxShadow: "0 0 60px rgba(167, 243, 208, 0.15), 0 0 120px rgba(167, 243, 208, 0.06)",
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
              You&rsquo;re in.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-solvent/50">
              Your account has been created. A warm welcome to the deep.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-phosphor mt-2 rounded-full px-8 py-3 text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // ── Registration Form ───────────────────────────────────────────────────

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

      {/* ── Form Halo (container) — not a card, never a rectangle ── */}
      <div
        className="relative w-full max-w-[440px] animate-fade-in rounded-[2.5rem] px-6 py-10 sm:px-10 sm:py-14"
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
            ResolveX
          </h1>
          <p className="mt-1 text-sm text-solvent/40">
            Enter the deep. Create your account.
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
          {/* Name */}
          <div className="floating-label">
            <input
              ref={nameRef}
              id="name"
              type="text"
              autoComplete="name"
              placeholder=" "
              value={name}
              onChange={handleFieldChange("name", setName)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              disabled={isLoading}
              className={`input-plasma w-full pb-2 pt-3 text-[15px] ${
                fieldErrors.name ? "error" : ""
              } ${name ? "filled" : ""}`}
            />
            <label htmlFor="name">Full name</label>
            <FieldError message={fieldErrors.name ?? ""} />
          </div>

          {/* Email */}
          <div className="floating-label">
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder=" "
              value={email}
              onChange={handleFieldChange("email", setEmail)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              disabled={isLoading}
              className={`input-plasma w-full pb-2 pt-3 text-[15px] ${
                fieldErrors.email ? "error" : ""
              } ${email ? "filled" : ""}`}
            />
            <label htmlFor="email">Email address</label>
            <FieldError message={fieldErrors.email ?? ""} />
          </div>

          {/* Password */}
          <div>
            <div className="floating-label">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder=" "
                  value={password}
                  onChange={handleFieldChange("password", setPassword)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLoading}
                  className={`input-plasma w-full pr-10 pb-2 pt-3 text-[15px] ${
                    fieldErrors.password ? "error" : ""
                  } ${password ? "filled" : ""}`}
                />
                <label htmlFor="password">Password</label>

                {/* Show / hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-0 bottom-2 flex items-center justify-center p-1 text-solvent/25 transition-colors hover:text-solvent/50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    /* Eye-off (simple arc) */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.5 10.5a3 3 0 004.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  ) : (
                    /* Eye */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </button>
              </div>
              <FieldError message={fieldErrors.password ?? ""} />
            </div>

            {/* Strength indicator */}
            <PasswordStrength value={password} />
          </div>

          {/* ── Submit ── */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-phosphor flex w-full items-center justify-center gap-3 rounded-full py-3.5 text-[15px]"
            >
              {isLoading ? (
                <>
                  <span className="spinner-ring" />
                  <span className="text-phosphor/60">Creating account...</span>
                </>
              ) : (
                <span className="tracking-wide">Enter the deep</span>
              )}
            </button>
          </div>
        </form>

        {/* ── Orbital progress ring (decorative, shows password strength) ── */}
        {focusedField === "password" && password.length > 0 && (
          <div
            className="absolute -bottom-4 -right-4 animate-fade-in"
            style={{ transform: "translate(50%, 50%)" }}
          >
            <OrbitalRing progress={passwordStrength} />
          </div>
        )}

        {/* ── Footer link ── */}
        <p className="mt-8 text-center text-sm text-solvent/30">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="font-medium text-phosphor/60 transition-colors hover:text-phosphor"
          >
            Sign in
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
