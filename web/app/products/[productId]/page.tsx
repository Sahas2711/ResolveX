"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface ServerError {
  code: string;
  message: string;
}

// ── Particle Field ─────────────────────────────────────────────────────────

function ParticleField() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: string; y: string; size: number;
    delay: number; duration: number; dx: string;
  }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 10 }, (_, i) => ({
        id: i, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`,
        size: 1.2 + Math.random() * 2, delay: Math.random() * 8,
        duration: 5 + Math.random() * 7, dx: `${-30 + Math.random() * 60}px`,
      })),
    );
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
        style={{ background: "radial-gradient(ellipse, rgba(167, 243, 208, 0.5) 0%, transparent 70%)", filter: "blur(100px)", animation: "drift 16s ease-in-out infinite" }}
      />
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────

function DeleteModal({
  productName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: {
  productName: string;
  isDeleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Modal halo */}
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(255, 111, 60, 0.08)",
          boxShadow: "0 0 60px rgba(255, 111, 60, 0.04)",
        }}
      >
        {/* Magma warning orb */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255, 111, 60, 0.15), rgba(255, 111, 60, 0.04))",
            border: "1px solid rgba(255, 111, 60, 0.12)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 9v4M12 17v0" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-solvent">Delete product?</h3>
        <p className="mt-2 text-sm leading-relaxed text-solvent/40">
          Are you sure you want to delete <span className="font-medium text-solvent/60">&ldquo;{productName}&rdquo;</span>? This action cannot be undone.
        </p>

        {error && (
          <div className="mt-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isDeleting ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)",
              color: "var(--color-magma)",
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Deleting...
              </span>
            ) : (
              "Delete permanently"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const auth = useAuth();
  const { isAuthenticated, isLoading: authLoading, profile } = auth;

  const [product, setProduct] = useState<Product | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.PRODUCT_UPDATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.PRODUCT_DELETE]).allowed : false;

  // ── Fetch product ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated || !productId) return;
    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/products/${productId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 404) { setError("Product not found"); setProduct(null); return; }
        if (!res.ok) throw new Error("Failed to fetch");
        const body = await res.json();
        setProduct(body.data ?? null);
      } catch { setError("Failed to load product"); } finally { setIsFetching(false); }
    })();
  }, [productId, authLoading, isAuthenticated]);

  // ── Delete handler ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!product) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/products/${product.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 409) {
        const body = await res.json();
        setDeleteError(body?.error?.message ?? "Product has active complaints and cannot be deleted.");
        setIsDeleting(false);
        return;
      }
      if (!res.ok) throw new Error("Delete failed");
      router.push("/products");
    } catch {
      setDeleteError("Failed to delete product. Please try again.");
      setIsDeleting(false);
    }
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return <main className="flex min-h-dvh items-center justify-center"><span className="spinner-ring" /></main>;
  }
  if (!isAuthenticated) return null;

  return (
    <main className="relative min-h-dvh px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ParticleField />

      <div className="pointer-events-none fixed top-1/4 left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 animate-pulse-glow rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200, 230, 201, 0.03) 0%, transparent 60%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-2xl">
        {/* ── Back link ── */}
        <button
          onClick={() => router.push("/products")}
          className="mb-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to products
        </button>

        {/* ── Loading ── */}
        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8" style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(200, 230, 201, 0.04)" }}>
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
          /* ── Error state ── */
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
            <button onClick={() => router.push("/products")} className="btn-phosphor rounded-full px-6 py-2.5 text-sm">Back to products</button>
          </div>
        ) : product ? (
          /* ── Product detail halo ── */
          <div className="animate-fade-in rounded-[2.5rem] p-6 sm:p-10"
            style={{
              background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
              backdropFilter: "blur(32px) saturate(0.8)",
              border: "1px solid rgba(200, 230, 201, 0.06)",
            }}
          >
            {/* Decorative top arc */}
            <div className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.12) 50%, transparent 100%)" }}
              aria-hidden="true"
            />

            {/* ── Header ── */}
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-medium text-solvent sm:text-3xl">{product.name}</h1>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase`}
                    style={{
                      background: product.status === "active" ? "rgba(167, 243, 208, 0.08)" : "rgba(240, 244, 248, 0.03)",
                      border: product.status === "active" ? "1px solid rgba(167, 243, 208, 0.12)" : "1px solid rgba(240, 244, 248, 0.04)",
                      color: product.status === "active" ? "var(--color-aurora)" : "rgba(240, 244, 248, 0.25)",
                    }}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full`}
                      style={{
                        backgroundColor: product.status === "active" ? "var(--color-aurora)" : "rgba(240, 244, 248, 0.15)",
                        boxShadow: product.status === "active" ? "0 0 6px rgba(167, 243, 208, 0.5)" : "none",
                      }}
                    />
                    {product.status}
                  </span>
                </div>
                {/* Timestamps */}
                <div className="mt-2 flex items-center gap-4 text-[11px] tracking-wide text-solvent/20 uppercase">
                  <span>Created {new Date(product.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span>Updated {new Date(product.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 gap-2">
                {canUpdate && (
                  <button
                    onClick={() => router.push(`/products/${product.id}/edit`)}
                    className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-phosphor/10 hover:text-phosphor"
                    aria-label="Edit product"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-magma/10 hover:text-magma"
                    aria-label="Delete product"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Description ── */}
            <div className="mb-8">
              <h2 className="mb-2 text-xs font-medium tracking-wider text-solvent/25 uppercase">Description</h2>
              {product.description ? (
                <p className="font-serif text-base leading-relaxed text-solvent/60 sm:text-lg" style={{ fontStyle: "italic" }}>
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-solvent/20 italic">No description provided.</p>
              )}
            </div>

            {/* ── Product ID ── */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
              <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Product ID</span>
              <p className="mt-1 font-mono text-xs text-solvent/35">{product.id}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Delete Modal ── */}
      {showDeleteModal && product && (
        <DeleteModal
          productName={product.name}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
        />
      )}
    </main>
  );
}
