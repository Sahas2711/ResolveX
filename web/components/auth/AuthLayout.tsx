"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Aurora wash */}
      <div
        className="absolute -top-[30%] -right-[20%] h-[60%] w-[50%] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.5) 0%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift 16s ease-in-out infinite",
        }}
      />
      {/* Bathyal wash */}
      <div
        className="absolute -bottom-[30%] -left-[20%] h-[60%] w-[50%] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(ellipse, rgba(46, 74, 74, 0.5) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "drift 14s ease-in-out infinite reverse",
        }}
      />
      {/* Magma accent */}
      <div
        className="absolute -bottom-[10%] right-[10%] h-[30%] w-[25%] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse, rgba(255, 111, 60, 0.3) 0%, transparent 70%)",
          filter: "blur(120px)",
          animation: "drift 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <main className="relative flex min-h-dvh overflow-hidden">
      {/* -- Left: Brand Panel -- */}
      <div
        className="relative hidden w-1/2 flex-col justify-between p-12 lg:flex"
        style={{
          background: theme === "dark"
            ? "linear-gradient(135deg, rgba(10, 14, 20, 0.95), rgba(19, 26, 36, 0.9))"
            : "linear-gradient(135deg, rgba(244, 246, 248, 0.95), rgba(255, 255, 255, 0.9))",
        }}
      >
        <ParticleField />

        {/* Logo */}
        <button
          onClick={() => router.push("/")}
          className="relative z-10 flex items-center gap-3"
        >
          <div
            className="h-8 w-8 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.6), rgba(167, 243, 208, 0.3))",
              boxShadow: "0 0 16px rgba(200, 230, 201, 0.15)",
            }}
          />
          <span className="text-lg font-medium tracking-tight text-solvent">ResolveX</span>
        </button>

        {/* Brand messaging */}
        <div className="relative z-10 max-w-md">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-wider uppercase"
            style={{
              background: "rgba(200, 230, 201, 0.06)",
              border: "1px solid rgba(200, 230, 201, 0.1)",
              color: "var(--color-phosphor)",
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-aurora" style={{ boxShadow: "0 0 6px rgba(167, 243, 208, 0.6)" }} />
            Intelligent Complaint Resolution
          </div>

          <h2 className="text-3xl font-light leading-tight tracking-tight text-solvent sm:text-4xl">
            The living membrane between{" "}
            <span className="font-medium text-phosphor">your organization</span>
            {" "}and your customers.
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-solvent/40">
            ResolveX routes, tracks, and resolves tickets with the precision of a deep-sea current — automatic, intelligent, and always flowing.
          </p>

          {/* Feature bullets */}
          <div className="mt-8 space-y-3">
            {[
              "Auto-assignment with least-load algorithm",
              "Real-time SLA monitoring & breach detection",
              "Role-based access control with 5 granular roles",
              "Comprehensive analytics & executive dashboards",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-solvent/50">
                <span className="inline-block h-1 w-1 rounded-full bg-phosphor/50" style={{ boxShadow: "0 0 4px rgba(200, 230, 201, 0.3)" }} />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-solvent/20">
          ResolveX &copy; 2026 &mdash; Enterprise Complaint Management
        </div>
      </div>

      {/* -- Right: Form Panel -- */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
  

        {/* Mobile brand header */}
        <div className="absolute top-6 left-6 flex items-center gap-2.5 lg:hidden">
          <div
            className="h-6 w-6 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.6), rgba(167, 243, 208, 0.3))",
              boxShadow: "0 0 10px rgba(200, 230, 201, 0.1)",
            }}
          />
          <span className="text-sm font-medium text-solvent">ResolveX</span>
        </div>

        {/* Form container */}
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-solvent/40">{subtitle}</p>
          </div>
          {children}
        </div>

        {/* Mobile footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-solvent/20 lg:hidden">
          ResolveX &copy; 2026
        </div>
      </div>
    </main>
  );
}
