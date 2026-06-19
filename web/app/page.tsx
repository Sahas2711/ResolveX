"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVEX — Enterprise Landing Page
// Deep ocean. Luminous plasma. Intelligent fluid.
// A living membrane between an organization and its customers.
// ═══════════════════════════════════════════════════════════════════════════

// ── Particle Field ──────────────────────────────────────────────────────────

function ParticleField({ density = 24 }: { density?: number }) {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: density }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: 1.2 + Math.random() * 2.8,
        delay: Math.random() * 10,
        duration: 6 + Math.random() * 8,
        dx: `${-40 + Math.random() * 80}px`,
      })),
    );
  }, [density]);

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
            boxShadow: `0 0 ${p.size * 4}px rgba(200, 230, 201, 0.25)`,
          } as React.CSSProperties}
        />
      ))}
      {/* Aurora wash — upper right */}
      <div
        className="absolute -top-[30%] -right-[20%] h-[70%] w-[50%] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.5) 0%, transparent 70%)",
          filter: "blur(120px)",
          animation: "drift 20s ease-in-out infinite",
        }}
      />
      {/* Bathyal wash — lower left */}
      <div
        className="absolute -bottom-[25%] -left-[15%] h-[60%] w-[45%] rounded-full opacity-[0.06]"
        style={{
          background: "radial-gradient(ellipse, rgba(46, 74, 74, 0.5) 0%, transparent 70%)",
          filter: "blur(100px)",
          animation: "drift 18s ease-in-out infinite reverse",
        }}
      />
      {/* Magma wash — bottom right accent */}
      <div
        className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[30%] rounded-full opacity-[0.02]"
        style={{
          background: "radial-gradient(ellipse, rgba(255, 111, 60, 0.3) 0%, transparent 70%)",
          filter: "blur(140px)",
          animation: "drift 22s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ── Stat Orb ───────────────────────────────────────────────────────────────

function StatOrb({
  value,
  label,
  gradient,
  delay,
}: {
  value: string;
  label: string;
  gradient: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-3 text-center transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full sm:h-28 sm:w-28"
        style={{
          background: gradient,
          border: "1px solid rgba(200, 230, 201, 0.08)",
          boxShadow: "0 0 40px rgba(200, 230, 201, 0.06), inset 0 0 30px rgba(200, 230, 201, 0.03)",
        }}
      >
        {/* Orbital ring */}
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 96 96"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="48" cy="48" r="44" stroke="rgba(200, 230, 201, 0.08)" strokeWidth="1" />
          <circle
            cx="48" cy="48" r="44"
            stroke="rgba(200, 230, 201, 0.25)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="276"
            strokeDashoffset="69"
          />
        </svg>
        <span className="font-sans text-2xl font-semibold tracking-tight text-solvent sm:text-3xl">
          {value}
        </span>
      </div>
      <span className="max-w-[120px] text-xs font-medium tracking-wide text-solvent/40 uppercase">
        {label}
      </span>
    </div>
  );
}

// ── Feature Card (soft disc, never a rectangle) ────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
  color,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group flex flex-col items-center gap-5 p-6 text-center transition-all duration-700 sm:p-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Icon orb */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full transition-all duration-500 group-hover:scale-110 sm:h-16 sm:w-16"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${color}22, ${color}08)`,
          border: `1px solid ${color}22`,
          boxShadow: `0 0 30px ${color}08, inset 0 0 20px ${color}06`,
        }}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-solvent sm:text-xl">{title}</h3>
        <p className="text-sm leading-relaxed text-solvent/45 sm:text-base">{description}</p>
      </div>
    </div>
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────

function NavBar() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "linear-gradient(180deg, rgba(10, 14, 20, 0.92), rgba(10, 14, 20, 0.7))"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(200, 230, 201, 0.04)" : "none",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5"
        >
          <div
            className="h-7 w-7 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.6), rgba(167, 243, 208, 0.3))",
              boxShadow: "0 0 12px rgba(200, 230, 201, 0.15)",
            }}
          />
          <span className="text-base font-medium tracking-tight text-solvent">ResolveX</span>
        </button>

        {/* Nav links — hidden on mobile */}
        <div className="hidden items-center gap-8 sm:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "Platform", href: "#stats" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-solvent/45 transition-colors duration-300 hover:text-phosphor"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="spinner-ring" />
          ) : isAuthenticated ? (
            <button
              onClick={() => router.push("/products")}
              className="btn-phosphor rounded-full px-5 py-2 text-sm"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className="rounded-full px-4 py-2 text-sm text-solvent/50 transition-colors hover:text-solvent"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/register")}
                className="btn-phosphor rounded-full px-5 py-2 text-sm"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Pulse Ring (system heartbeat) ──────────────────────────────────────────

function PulseRing() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden="true">
      <div
        className="absolute h-72 w-72 animate-pulse-glow rounded-full sm:h-96 sm:w-96"
        style={{
          background: "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute h-48 w-48 animate-float rounded-full sm:h-64 sm:w-64"
        style={{
          background: "radial-gradient(circle, rgba(200, 230, 201, 0.06) 0%, transparent 50%)",
        }}
      />
      {/* Inner system orb */}
      <div
        className="relative h-20 w-20 animate-breath rounded-full sm:h-24 sm:w-24"
        style={{
          background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.2), rgba(167, 243, 208, 0.08))",
          border: "1px solid rgba(200, 230, 201, 0.12)",
          boxShadow: "0 0 40px rgba(200, 230, 201, 0.08), inset 0 0 30px rgba(200, 230, 201, 0.04)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <ParticleField density={28} />
      <NavBar />

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-6 pt-24 pb-20 text-center sm:px-8">
        {/* Ambient glow */}
        <div
          className="pointer-events-none fixed top-1/2 left-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(200, 230, 201, 0.04) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* Pulse Ring */}
        <div className="mb-12 animate-fade-in">
          <PulseRing />
        </div>

        {/* Tagline */}
        <div className="relative z-10 max-w-3xl animate-slide-up">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wider uppercase"
            style={{
              background: "rgba(200, 230, 201, 0.06)",
              border: "1px solid rgba(200, 230, 201, 0.1)",
              color: "var(--color-phosphor)",
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-aurora" style={{ boxShadow: "0 0 6px rgba(167, 243, 208, 0.6)" }} />
            Intelligent Complaint Resolution
          </div>

          <h1 className="font-sans text-4xl font-light leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The living membrane between
            <br />
            <span className="font-medium text-phosphor">your organization</span>
            <br />
            and your customers.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-solvent/45 sm:text-lg">
            ResolveX is an enterprise-grade complaint management platform that
            routes, tracks, and resolves tickets with the precision of a deep-sea
            current — automatic, intelligent, and always flowing.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => router.push("/register")}
              className="btn-phosphor group relative flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[15px]"
            >
              <span>Start resolving</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-8 py-3.5 text-[15px] text-solvent/40 transition-all duration-300 hover:text-solvent"
              style={{
                border: "1px solid rgba(240, 244, 248, 0.08)",
              }}
            >
              Explore features
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <svg width="20" height="30" viewBox="0 0 20 30" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="17" height="27" rx="8.5" stroke="rgba(200, 230, 201, 0.15)" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2" fill="rgba(200, 230, 201, 0.3)" />
          </svg>
        </div>
      </section>

      {/* ── STATS / TRUST SECTION ────────────────────────────────────── */}
      <section id="stats" className="relative py-24 sm:py-32">
        {/* Section fog — depth separator */}
        <div
          className="pointer-events-none absolute top-0 right-0 left-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.06) 50%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-5xl px-6 sm:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-sans text-2xl font-light text-solvent sm:text-3xl md:text-4xl">
              Trusted by enterprises that
              <br />
              <span className="font-medium text-phosphor">demand resolution at scale</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12">
            <StatOrb
              value="$100M+"
              label="Complaint Value Managed"
              gradient="radial-gradient(circle at 35% 30%, rgba(200, 230, 201, 0.12), rgba(10, 14, 20, 0.8))"
              delay={0}
            />
            <StatOrb
              value="10K+"
              label="Tickets / Day"
              gradient="radial-gradient(circle at 35% 30%, rgba(167, 243, 208, 0.12), rgba(10, 14, 20, 0.8))"
              delay={150}
            />
            <StatOrb
              value="99.7%"
              label="SLA Compliance"
              gradient="radial-gradient(circle at 35% 30%, rgba(46, 74, 74, 0.2), rgba(10, 14, 20, 0.8))"
              delay={300}
            />
            <StatOrb
              value="3.2m"
              label="Avg. Resolution"
              gradient="radial-gradient(circle at 35% 30%, rgba(226, 196, 152, 0.12), rgba(10, 14, 20, 0.8))"
              delay={450}
            />
          </div>
        </div>

        {/* Bottom fog */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 left-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.06) 50%, transparent 100%)",
          }}
          aria-hidden="true"
        />
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-sans text-2xl font-light text-solvent sm:text-3xl md:text-4xl">
              Everything you need to
              <br />
              <span className="font-medium text-phosphor">resolve at depth</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-solvent/40">
              From auto-assignment to real-time analytics — ResolveX surfaces what matters before it surfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2v20M2 12h20" stroke="rgba(200, 230, 201, 0.7)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="8" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1" fill="none" />
                </svg>
              }
              title="Auto-Assignment Engine"
              description="New complaints are instantly routed to the most available agent using our least-load algorithm. No queue, no delay."
              color="rgba(200, 230, 201, 1)"
              index={0}
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10A15 15 0 0112 2z" stroke="rgba(167, 243, 208, 0.7)" strokeWidth="1.5" fill="none" />
                  <circle cx="12" cy="12" r="3" stroke="rgba(167, 243, 208, 0.4)" strokeWidth="1" fill="none" />
                </svg>
              }
              title="SLA Tracking & Breach Detection"
              description="Real-time SLA monitoring with configurable deadlines, breach detection, and automated escalation workflows."
              color="rgba(167, 243, 208, 1)"
              index={1}
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4h16v16H4z" stroke="rgba(46, 74, 74, 0.7)" strokeWidth="1.5" fill="none" />
                  <path d="M8 9h8M8 13h6M8 17h4" stroke="rgba(46, 74, 74, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="Role-Based Access Control"
              description="Five granular roles from Customer to Admin with explicit permission scopes. Enforce least-privilege out of the box."
              color="rgba(46, 74, 74, 1)"
              index={2}
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 3v18h18" stroke="rgba(226, 196, 152, 0.7)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 16l4-6 4 4 4-8" stroke="rgba(226, 196, 152, 0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="Real-Time Dashboards"
              description="Staff productivity, team workload, product analytics, and executive KPIs — all updated in real time with date-range filtering."
              color="rgba(226, 196, 152, 1)"
              index={3}
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="rgba(200, 230, 201, 0.7)" strokeWidth="1.5" fill="none" />
                  <path d="M12 6v6l4 2" stroke="rgba(200, 230, 201, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              }
              title="Complaint Lifecycle Engine"
              description="Eight-state status machine with strict transition validation, immutable audit trails, and full timeline reconstruction."
              color="rgba(200, 230, 201, 1)"
              index={4}
            />
            <FeatureCard
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 5h14v14H5z" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="1.5" fill="none" />
                  <path d="M12 5v14M5 12h14" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1" />
                  <circle cx="12" cy="12" r="2" stroke="rgba(255, 111, 60, 0.5)" strokeWidth="1" fill="none" />
                </svg>
              }
              title="Webhook Integrations"
              description="Subscribe to complaint.created, assigned, status_changed, and sla_breached events. HMAC-signed payloads for security."
              color="rgba(255, 111, 60, 1)"
              index={5}
            />
          </div>
        </div>
      </section>

      {/* ── PRODUCT MANAGEMENT SECTION ───────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div
          className="pointer-events-none absolute top-0 right-0 left-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.06) 50%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-5xl px-6 text-center sm:px-8">
          <div className="mb-14">
            <h2 className="font-sans text-2xl font-light text-solvent sm:text-3xl md:text-4xl">
              Manage your <span className="font-medium text-phosphor">product catalog</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-solvent/40">
              Create, update, and organize your products with ease. Each product carries its own SLA rules, team mappings, and complaint categories.
            </p>
          </div>

          {/* Product management halo */}
          <div
            className="mx-auto max-w-md animate-fade-in rounded-[2.5rem] p-8 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(19, 26, 36, 0.7), rgba(26, 31, 40, 0.6))",
              backdropFilter: "blur(24px) saturate(0.8)",
              border: "1px solid rgba(200, 230, 201, 0.06)",
            }}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{
                background: "radial-gradient(circle at 35% 30%, rgba(200, 230, 201, 0.15), rgba(200, 230, 201, 0.05))",
                border: "1px solid rgba(200, 230, 201, 0.12)",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="rgba(200, 230, 201, 0.7)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-solvent">Ready to get started?</h3>
                <p className="mt-1 text-sm text-solvent/40">
                  Create your first product and configure SLA rules, team assignments, and complaint categories.
                </p>
              </div>
              <button
                onClick={() => router.push("/register")}
                className="btn-phosphor w-full rounded-full py-3 text-sm"
              >
                Create your first product
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div
          className="pointer-events-none absolute top-0 right-0 left-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.06) 50%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <PulseRing />
          <div className="relative z-10 -mt-10">
            <h2 className="font-sans text-3xl font-light text-solvent sm:text-4xl md:text-5xl">
              Enter the deep.
              <br />
              <span className="font-medium text-phosphor">Start resolving.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-solvent/40">
              Join enterprises that trust ResolveX to manage millions in complaint value every day.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => router.push("/register")}
                className="btn-phosphor rounded-full px-8 py-3.5 text-[15px]"
              >
                Get started free
              </button>
              <button
                onClick={() => router.push("/login")}
                className="rounded-full px-8 py-3.5 text-[15px] text-solvent/40 transition-all duration-300 hover:text-solvent"
                style={{ border: "1px solid rgba(240, 244, 248, 0.08)" }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer
        className="relative py-12"
        style={{
          borderTop: "1px solid rgba(200, 230, 201, 0.04)",
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="h-5 w-5 rounded-full"
              style={{
                background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.5), rgba(167, 243, 208, 0.2))",
                boxShadow: "0 0 8px rgba(200, 230, 201, 0.1)",
              }}
            />
            <span className="text-sm font-medium text-solvent/30">ResolveX © 2026</span>
          </div>
          <span className="text-xs text-solvent/20">
            A living membrane between an organization and its customers.
          </span>
        </div>
      </footer>

      {/* ── Ground glow ── */}
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 h-40 w-[90vmin] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(200, 230, 201, 0.03) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        aria-hidden="true"
      />
    </main>
  );
}
