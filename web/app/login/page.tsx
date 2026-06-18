"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  email?: string;
  password?: string;
}

interface ServerError {
  code: string;
  message: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// ── Particle Background ───────────────────────────────────────────────────

function ParticleField() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
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

// ── Field Error ────────────────────────────────────────────────────────────

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">
      {message}
    </p>
  );
}

// ── Main Login Page ────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }

    if (!password) {
      errors.password = "Password is required";
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
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        // 422 — server-side validation errors
        if (res.status === 422 && body?.error?.details) {
          const serverFieldErrors: FieldErrors = {};
          for (const d of body.error.details) {
            if (d.field === "email") serverFieldErrors.email = d.message;
            if (d.field === "password") serverFieldErrors.password = d.message;
          }
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
            setIsLoading(false);
            return;
          }
        }

        // Generic / auth error
        setServerError({
          code: body?.error?.code ?? "AUTH_FAILED",
          message:
            body?.error?.message ??
            "Invalid email or password. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      // ── Success: store tokens & redirect ──
      const data: LoginResponse = (await res.json()).data;

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      // Brief delay for a smooth transition feeling
      await new Promise((r) => setTimeout(r, 300));
      router.push("/");
    } catch {
      setServerError({
        code: "NETWORK_ERROR",
        message: "Unable to connect to the server. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function handleFieldChange(
    field: keyof FieldErrors,
    setter: (v: string) => void,
  ) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (serverError) setServerError(null);
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <ParticleField />

      {/* ── Ambient glow orb ── */}
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* ── Login Halo ── */}
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
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-solvent/40">
            Return to the deep. Sign in to your account.
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
          {/* Email */}
          <div className="floating-label">
            <input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              placeholder=" "
              value={email}
              onChange={handleFieldChange("email", setEmail)}
              disabled={isLoading}
              className={`input-plasma w-full pb-2 pt-3 text-[15px] ${
                fieldErrors.email ? "error" : ""
              } ${email ? "filled" : ""}`}
            />
            <label htmlFor="email">Email address</label>
            <FieldError message={fieldErrors.email ?? ""} />
          </div>

          {/* Password */}
          <div className="floating-label">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={handleFieldChange("password", setPassword)}
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

          {/* ── Remember me ── */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((p) => !p)}
              className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] transition-all duration-300"
              style={{
                background: rememberMe
                  ? "rgba(200, 230, 201, 0.15)"
                  : "rgba(240, 244, 248, 0.04)",
                border: rememberMe
                  ? "1px solid rgba(200, 230, 201, 0.3)"
                  : "1px solid rgba(240, 244, 248, 0.12)",
                boxShadow: rememberMe
                  ? "0 0 8px rgba(200, 230, 201, 0.1)"
                  : "none",
              }}
            >
              {rememberMe && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                  className="animate-fade-in"
                >
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="var(--color-phosphor)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span
              className="select-none text-[13px] text-solvent/35 transition-colors hover:text-solvent/50"
              style={{ cursor: "pointer" }}
              onClick={() => setRememberMe((p) => !p)}
            >
              Remember this device
            </span>
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
                  <span className="text-phosphor/60">Signing in...</span>
                </>
              ) : (
                <span className="tracking-wide">Return to the deep</span>
              )}
            </button>
          </div>
        </form>

        {/* ── Footer links ── */}
        <div className="mt-8 space-y-2 text-center">
          <p className="text-sm text-solvent/30">
            Don&rsquo;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="font-medium text-phosphor/60 transition-colors hover:text-phosphor"
            >
              Create one
            </button>
          </p>
          {/* TODO: Add forgot-password link when that page exists */}
        </div>
      </div>

      {/* ── Ambient ground glow ── */}
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
