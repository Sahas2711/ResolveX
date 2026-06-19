"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

// ── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// ── Particle Field ─────────────────────────────────────────────────────────

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 100}%`,
        size: 1.2 + Math.random() * 2,
        delay: Math.random() * 8,
        duration: 5 + Math.random() * 7,
        dx: `${-30 + Math.random() * 60}px`,
      })),
    );
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-phosphor"
          style={{
            width: p.size, height: p.size, left: p.x, top: p.y,
            opacity: 0,
            animation: `particle-float ${p.duration}s ease-out ${p.delay}s infinite`,
            "--dx": p.dx,
            boxShadow: `0 0 ${p.size * 3}px rgba(200, 230, 201, 0.25)`,
          } as React.CSSProperties}
        />
      ))}
      <div className="absolute -top-[30%] -right-[20%] h-[60%] w-[40%] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Status Dot ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: "active" | "inactive" }) {
  const isActive = status === "active";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full transition-all duration-500"
        style={{
          backgroundColor: isActive ? "var(--color-aurora)" : "rgba(240, 244, 248, 0.15)",
          boxShadow: isActive ? "0 0 6px rgba(167, 243, 208, 0.5)" : "none",
        }}
      />
      <span style={{ color: isActive ? "rgba(167, 243, 208, 0.7)" : "rgba(240, 244, 248, 0.25)" }}>
        {status}
      </span>
    </span>
  );
}

// ── Search Bar ─────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="rgba(240, 244, 248, 0.2)" strokeWidth="1.5" fill="none" />
        <path d="M16 16l5 5" stroke="rgba(240, 244, 248, 0.2)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="input-plasma w-full rounded-full py-2.5 pl-9 pr-4 text-[13px]"
        style={{ border: "1px solid rgba(240, 244, 248, 0.06)", borderRadius: "9999px" }}
      />
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(200, 230, 201, 0.08), transparent 70%)",
          border: "1px solid rgba(200, 230, 201, 0.06)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="rgba(200, 230, 201, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-solvent/50">No products yet</p>
        <p className="mt-1 text-xs text-solvent/30">Create your first product to get started.</p>
      </div>
      <button onClick={onCreate} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">
        Create product
      </button>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl p-5" style={{
          background: "rgba(19, 26, 36, 0.5)",
          border: "1px solid rgba(200, 230, 201, 0.04)",
        }}>
          <div className="mb-2 h-4 w-2/5 rounded bg-bathyal/20" />
          <div className="h-3 w-4/5 rounded bg-bathyal/10" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PRODUCTS LIST PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const canCreate = profile ? checkPermissions(auth, [Permissions.PRODUCT_CREATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.PRODUCT_DELETE]).allowed : false;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch products ───────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (p: number, q: string, s: string) => {
    setIsFetching(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (q) params.set("search", q);
      if (s && s !== "all") params.set("status", s);

      const res = await fetch(`/api/v1/products?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();
      setProducts(body.data ?? []);
      setMeta(body.meta ?? null);
    } catch {
      setProducts([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // ── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(page, search, statusFilter), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [page, search, statusFilter, authLoading, isAuthenticated, fetchProducts]);

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <span className="spinner-ring" />
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ParticleField />

      {/* ── Ambient orb ── */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      {/* ── Header ── */}
      <div className="mx-auto mb-8 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-solvent sm:text-3xl">Products</h1>
          <p className="mt-0.5 text-sm text-solvent/35">
            {meta ? `${meta.totalItems} product${meta.totalItems !== 1 ? "s" : ""} in catalog` : "Product catalog"}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => router.push("/products/create")}
            className="btn-phosphor flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New product
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="mx-auto mb-6 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products..." />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="rounded-full px-4 py-2 text-xs font-medium tracking-wide uppercase transition-all duration-300"
              style={{
                background: statusFilter === s ? "rgba(200, 230, 201, 0.08)" : "rgba(240, 244, 248, 0.02)",
                border: statusFilter === s ? "1px solid rgba(200, 230, 201, 0.15)" : "1px solid rgba(240, 244, 248, 0.04)",
                color: statusFilter === s ? "var(--color-phosphor)" : "rgba(240, 244, 248, 0.25)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product list ── */}
      <div className="mx-auto max-w-4xl">
        {isFetching ? (
          <ProductSkeleton />
        ) : products.length === 0 ? (
          <EmptyState onCreate={() => router.push("/products/create")} />
        ) : (
          <div className="space-y-3">
            {products.map((product, i) => (
              <button
                key={product.id}
                onClick={() => router.push(`/products/${product.id}`)}
                className="group w-full animate-slide-up rounded-2xl p-5 text-left transition-all duration-500 hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                  border: "1px solid rgba(200, 230, 201, 0.04)",
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-base font-medium text-solvent group-hover:text-phosphor transition-colors">
                        {product.name}
                      </h3>
                      <StatusDot status={product.status} />
                    </div>
                    {product.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-solvent/35">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canDelete && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/products/${product.id}`);
                        }}
                        className="rounded-full p-2 text-solvent/20 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                        aria-label="Delete product"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                      className="shrink-0 text-solvent/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-phosphor"
                    >
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[11px] tracking-wide text-solvent/20 uppercase">
                  <span>{new Date(product.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full px-4 py-2 text-xs transition-all duration-300 disabled:opacity-20"
              style={{
                border: "1px solid rgba(240, 244, 248, 0.06)",
                color: page <= 1 ? "rgba(240, 244, 248, 0.15)" : "var(--color-solvent)",
              }}
            >
              Previous
            </button>
            <span className="text-xs text-solvent/30 tabular-nums">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-full px-4 py-2 text-xs transition-all duration-300 disabled:opacity-20"
              style={{
                border: "1px solid rgba(240, 244, 248, 0.06)",
                color: page >= meta.totalPages ? "rgba(240, 244, 248, 0.15)" : "var(--color-solvent)",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
