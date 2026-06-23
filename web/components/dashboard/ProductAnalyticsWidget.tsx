"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@/hooks/useAuth";

// -- Types ------------------------------------------------------------------

interface ProductInfo {
  id: string;
  productName: string;
}

interface FrequentIssue {
  issue: string;
  count: number;
}

interface TrendPoint {
  period: string;
  count: number;
}

interface ProductAnalyticsData {
  productId: string;
  productName: string;
  totalComplaints: number;
  categoryBreakdown: Record<string, number>;
  frequentIssues: FrequentIssue[];
  slaViolationRate: number | null;
  resolutionTrend: TrendPoint[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

function ProductSelector({
  products, selectedId, onChange, isLoading,
}: {
  products: ProductInfo[]; selectedId: string; onChange: (id: string) => void; isLoading: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading || products.length === 0}
        className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm text-solvent transition-all duration-300"
        style={{
          background: "rgba(10,14,20,0.4)",
          border: "1px solid rgba(200,230,201,0.06)",
        }}
      >
        {products.length === 0 ? (
          <option value="">No products available</option>
        ) : (
          products.map((p) => (
            <option key={p.id} value={p.id} className="bg-hadal text-solvent">
              {p.productName}
            </option>
          ))
        )}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-solvent/20">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({
  label, value, color, accent,
}: {
  label: string; value: string | number; color: string; accent: string;
}) {
  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${color}06, ${color}02)`,
        border: `1px solid ${color}10`,
      }}
    >
      <p className="text-[10px] font-medium tracking-wider text-solvent/25 uppercase">{label}</p>
      <p className="mt-1 font-sans text-xl font-semibold tracking-tight" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY BREAKDOWN BAR
// ═══════════════════════════════════════════════════════════════════════════

function CategoryBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const colors = [
    "var(--color-phosphor)",
    "var(--color-aurora)",
    "var(--color-cosmic-dust)",
    "rgba(167,243,208,0.6)",
    "rgba(200,230,201,0.5)",
    "rgba(226,196,152,0.4)",
  ];

  if (entries.length === 0) {
    return <p className="py-4 text-center text-xs text-solvent/20">No category data</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map(([name, count], i) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        const color = colors[i % colors.length];
        return (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-solvent/60">{name}</span>
              <span className="ml-3 font-mono tabular-nums text-solvent/40">{count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(10,14,20,0.5)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color, opacity: 0.55 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FREQUENT ISSUES LIST
// ═══════════════════════════════════════════════════════════════════════════

function FrequentIssues({ issues }: { issues: FrequentIssue[] }) {
  const maxCount = issues.length > 0 ? issues[0].count : 1;

  if (issues.length === 0) {
    return <p className="py-4 text-center text-xs text-solvent/20">No issues data</p>;
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, i) => {
        const pct = (issue.count / maxCount) * 100;
        return (
          <div key={issue.issue} className="flex items-center gap-3">
            <span className="w-5 text-right text-[10px] font-mono text-solvent/20">{i + 1}</span>
            <span className="flex-1 truncate text-xs text-solvent/50">{issue.issue}</span>
            <div className="w-20">
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(10,14,20,0.5)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, var(--color-phosphor), rgba(200,230,201,0.2))`,
                    opacity: 0.5,
                  }}
                />
              </div>
            </div>
            <span className="w-8 text-right font-mono text-xs tabular-nums text-solvent/40">{issue.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLUTION TREND (simple bar chart)
// ═══════════════════════════════════════════════════════════════════════════

function ResolutionTrend({ trend }: { trend: TrendPoint[] }) {
  const maxCount = trend.length > 0 ? Math.max(...trend.map((t) => t.count)) : 1;

  if (trend.length === 0) {
    return <p className="py-4 text-center text-xs text-solvent/20">No resolution trend data</p>;
  }

  return (
    <div className="flex items-end gap-2" style={{ minHeight: "6rem" }}>
      {trend.map((point) => {
        const pct = (point.count / maxCount) * 100;
        return (
          <div key={point.period} className="group relative flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: "5rem" }}>
              <div
                className="w-full rounded-t-sm transition-all duration-500 group-hover:opacity-80"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  background: "linear-gradient(180deg, var(--color-phosphor), rgba(200,230,201,0.15))",
                  opacity: 0.55,
                }}
              />
            </div>
            <span className="mt-1 text-[8px] text-solvent/20 tracking-tight">{point.period.slice(-2)}</span>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-abyss/80 px-1.5 py-0.5 text-[10px] font-mono text-phosphor/60 opacity-0 transition-opacity group-hover:opacity-100">
              {point.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SLA VIOLATION GAUGE
// ═══════════════════════════════════════════════════════════════════════════

function SlaViolationGauge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(10,14,20,0.3)", border: "1px solid rgba(200,230,201,0.03)" }}>
        <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">SLA Violation Rate</p>
        <p className="mt-2 text-xs text-solvent/20 italic">Insufficient data</p>
      </div>
    );
  }

  const isGood = rate <= 5;
  const color = isGood ? "var(--color-aurora)" : rate <= 15 ? "var(--color-cosmic-dust)" : "var(--color-magma)";

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(10,14,20,0.3)", border: "1px solid rgba(200,230,201,0.03)" }}>
      <p className="text-[10px] font-medium tracking-wider text-solvent/20 uppercase">SLA Violation Rate</p>
      <p className="mt-1 font-mono text-xl font-semibold tracking-tight" style={{ color }}>
        {rate}%
      </p>
      <p className="mt-0.5 text-[10px] text-solvent/20">
        {isGood ? "Healthy" : rate <= 15 ? "Moderate" : "Critical"}
      </p>
      {/* Mini progress bar (inverted — lower is better) */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(10,14,20,0.5)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, rate)}%`,
            background: `linear-gradient(90deg, ${color}, ${color}44)`,
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductAnalyticsWidget() {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [data, setData] = useState<ProductAnalyticsData | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -- Fetch products list -------------------------------------------
  useEffect(() => {
    async function loadProducts() {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/v1/products?pageSize=100", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to load products");
        const body = await res.json();
        const productList: ProductInfo[] = body.data ?? [];
        setProducts(productList);
        if (productList.length > 0 && !selectedProductId) {
          setSelectedProductId(productList[0].id);
        }
      } catch {
        setError("Could not load products");
      } finally {
        setIsLoadingProducts(false);
      }
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    loadProducts();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Fetch analytics when product changes --------------------------
  const fetchAnalytics = useCallback(async (productId: string) => {
    if (!productId) return;
    setIsLoadingAnalytics(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/dashboard/product/${productId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load product analytics");
      const body = await res.json();
      setData(body.data ?? null);
    } catch {
      setError("Could not load product analytics");
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) fetchAnalytics(selectedProductId);
  }, [selectedProductId, fetchAnalytics]);

  // -- Loading state -------------------------------------------------
  if (isLoadingProducts) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-10 w-64 rounded-xl" style={{ background: "rgba(19,26,36,0.5)", border: "1px solid rgba(200,230,201,0.03)" }} />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl p-4" style={{ background: "rgba(19,26,36,0.5)", border: "1px solid rgba(200,230,201,0.03)" }}>
              <div className="h-3 w-2/3 rounded bg-bathyal/10" />
              <div className="mt-2 h-6 w-1/2 rounded bg-bathyal/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,111,60,0.08)", border: "1px solid rgba(255,111,60,0.1)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17v0" stroke="rgba(255,111,60,0.6)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="rgba(255,111,60,0.3)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <p className="text-sm text-magma">{error}</p>
        <button onClick={() => selectedProductId && fetchAnalytics(selectedProductId)} className="btn-phosphor rounded-full px-4 py-1.5 text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product selector */}
      <div className="flex items-center gap-3">
        <ProductSelector
          products={products}
          selectedId={selectedProductId}
          onChange={setSelectedProductId}
          isLoading={isLoadingProducts}
        />
        {isLoadingAnalytics && <span className="spinner-ring shrink-0" />}
      </div>

      {data ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Total Complaints" value={data.totalComplaints.toLocaleString()} color="rgba(200,230,201,1)" accent="var(--color-phosphor)" />
            <KpiCard
              label="Categories"
              value={Object.keys(data.categoryBreakdown).length}
              color="rgba(167,243,208,1)"
              accent="var(--color-aurora)"
            />
            <KpiCard
              label="Top Issues"
              value={data.frequentIssues.length}
              color="rgba(226,196,152,1)"
              accent="var(--color-cosmic-dust)"
            />
            <SlaViolationGauge rate={data.slaViolationRate} />
          </div>

          {/* Main grid: Category Breakdown + Frequent Issues + Resolution Trend */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(10,14,20,0.3)",
                border: "1px solid rgba(200,230,201,0.03)",
              }}
            >
              <h4 className="mb-4 text-xs font-medium text-solvent/60">Category Breakdown</h4>
              <CategoryBreakdown data={data.categoryBreakdown} />
            </div>

            {/* Frequent Issues */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(10,14,20,0.3)",
                border: "1px solid rgba(200,230,201,0.03)",
              }}
            >
              <h4 className="mb-4 text-xs font-medium text-solvent/60">Frequent Issues</h4>
              <FrequentIssues issues={data.frequentIssues} />
            </div>
          </div>

          {/* Resolution Trend */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(10,14,20,0.3)",
              border: "1px solid rgba(200,230,201,0.03)",
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-medium text-solvent/60">Resolution Trend</h4>
              <span className="text-[10px] text-solvent/20">Monthly resolved complaints</span>
            </div>
            <ResolutionTrend trend={data.resolutionTrend} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-solvent/30">Select a product to view analytics</p>
        </div>
      )}
    </div>
  );
}
