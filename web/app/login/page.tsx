"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";

// -- Types ------------------------------------------------------------------

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

// -- Field Error ------------------------------------------------------------

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 animate-slide-up text-[12px] font-medium text-magma">
      {message}
    </p>
  );
}

// -- Main Login Page --------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // -- Validation ----------------------------------------------------------

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

  // -- Submit --------------------------------------------------------------

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

      // -- Success: store tokens & redirect --
      const data: LoginResponse = (await res.json()).data;

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Brief delay for a smooth transition feeling
      await new Promise((r) => setTimeout(r, 300));
      router.push("/dashboard");
    } catch {
      setServerError({
        code: "NETWORK_ERROR",
        message: "Unable to connect to the server. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // -- Helpers -------------------------------------------------------------

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

  // -- Render --------------------------------------------------------------

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Return to the deep. Sign in to your account."
    >
      {/* -- Server Error Banner -- */}
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

      {/* -- Form -- */}
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
                  <path d="M3 3l18 18M10.5 10.5a3 3 0 004.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M1 12s3-7 11-7 11 7 11 7-3 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </button>
          </div>
          <FieldError message={fieldErrors.password ?? ""} />
        </div>

        {/* -- Submit -- */}
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

      {/* -- Footer links -- */}
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
      </div>
    </AuthLayout>
  );
}
