"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, useAuth, checkPermissions } from "@/hooks/useAuth";
import { Permissions } from "@/lib/permissions";

// -- Types ------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface TeamMapping {
  teamId: string;
  teamName: string;
  isPrimary: boolean;
  loadWeight: number;
}

interface TeamSearchResult {
  id: string;
  teamName: string;
  description: string | null;
}

// -- Particle Field ---------------------------------------------------------

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

// -- Delete Product Modal ---------------------------------------------------

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
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(255, 111, 60, 0.08)",
          boxShadow: "0 0 60px rgba(255, 111, 60, 0.04)",
        }}
      >
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
          <button onClick={onCancel} disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isDeleting ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)", color: "var(--color-magma)",
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Deleting...
              </span>
            ) : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Unmap Team Confirmation Modal ------------------------------------------

function UnmapTeamModal({
  teamName,
  isUnmapping,
  error,
  onConfirm,
  onCancel,
}: {
  teamName: string;
  isUnmapping: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-slide-up rounded-[2rem] p-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(255, 111, 60, 0.08)",
        }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255, 111, 60, 0.12), rgba(255, 111, 60, 0.03))",
            border: "1px solid rgba(255, 111, 60, 0.1)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M17 7l-5 5m0 0l-5-5m5 5V3" stroke="rgba(255, 111, 60, 0.7)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7" stroke="rgba(255, 111, 60, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="text-lg font-medium text-solvent">Remove team mapping?</h3>
        <p className="mt-2 text-sm leading-relaxed text-solvent/40">
          Are you sure you want to unmap <span className="font-medium text-solvent/60">&ldquo;{teamName}&rdquo;</span>?
          Complaints will no longer auto-route to this team.
        </p>

        {error && (
          <div className="mt-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} disabled={isUnmapping}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >Keep mapping</button>
          <button onClick={onConfirm} disabled={isUnmapping}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isUnmapping ? "rgba(255, 111, 60, 0.1)" : "rgba(255, 111, 60, 0.15)",
              border: "1px solid rgba(255, 111, 60, 0.2)", color: "var(--color-magma)",
              opacity: isUnmapping ? 0.5 : 1,
            }}
          >
            {isUnmapping ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-magma border-t-transparent" />
                Removing...
              </span>
            ) : "Remove mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Map Team Modal ---------------------------------------------------------

function MapTeamModal({
  isOpen,
  isSubmitting,
  error,
  mappedTeamIds,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  mappedTeamIds: string[];
  onClose: () => void;
  onSubmit: (teamId: string, isPrimary: boolean, loadWeight: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [isPrimary, setIsPrimary] = useState(false);
  const [loadWeight, setLoadWeight] = useState(1.0);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedTeam(null);
      setIsPrimary(false);
      setLoadWeight(1.0);
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Debounced team search
  useEffect(() => {
    if (!searchQuery.trim() || selectedTeam) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/v1/teams?search=${encodeURIComponent(searchQuery)}&pageSize=10`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          const teams: TeamSearchResult[] = (body?.data ?? []).map((t: { id: string; name: string; description: string | null }) => ({
            id: t.id,
            teamName: t.name,
            description: t.description,
          }));
          // Filter out already-mapped teams
          const filtered = teams.filter((t) => !mappedTeamIds.includes(t.id));
          setSearchResults(filtered);
          setShowDropdown(filtered.length > 0);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, selectedTeam, mappedTeamIds]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  function handleSelectTeam(team: TeamSearchResult) {
    setSelectedTeam(team);
    setSearchQuery(team.teamName);
    setShowDropdown(false);
    setSearchResults([]);
  }

  function handleClearSelection() {
    setSelectedTeam(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-up rounded-[2rem] p-6 sm:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(26, 31, 40, 0.9), rgba(19, 26, 36, 0.85))",
          backdropFilter: "blur(32px) saturate(0.8)",
          border: "1px solid rgba(200, 230, 201, 0.08)",
        }}
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(200, 230, 201, 0.15), rgba(200, 230, 201, 0.05))", border: "1px solid rgba(200, 230, 201, 0.12)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="rgba(200, 230, 201, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 14l2 2 4-4" stroke="rgba(200, 230, 201, 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-solvent">Map team to product</h3>
          <p className="mt-1 text-sm text-solvent/40">Search and select a support team to map to this product.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl px-3 py-2 text-xs text-magma" style={{ background: "rgba(255, 111, 60, 0.08)", border: "1px solid rgba(255, 111, 60, 0.1)" }}>
            {error}
          </div>
        )}

        {/* -- Team Search -- */}
        <div ref={searchRef} className="relative mb-4">
          {selectedTeam ? (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: "rgba(200, 230, 201, 0.08)", border: "1px solid rgba(200, 230, 201, 0.12)" }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(200, 230, 201, 0.15)" }}
              >
                <span className="text-xs font-medium text-phosphor">
                  {selectedTeam.teamName.charAt(0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-solvent/70">
                  {selectedTeam.teamName}
                </p>
                {selectedTeam.description && (
                  <p className="truncate text-xs text-solvent/30">{selectedTeam.description}</p>
                )}
              </div>
              <button onClick={handleClearSelection} disabled={isSubmitting}
                className="shrink-0 rounded-full p-1 text-solvent/20 transition-colors hover:text-magma"
                aria-label="Clear selection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="floating-label">
              <input id="teamSearch" type="text" autoComplete="off" placeholder=" "
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSubmitting} autoFocus
                className={`input-plasma w-full pb-2 pt-3 text-[14px] ${searchQuery ? "filled" : ""}`}
              />
              <label htmlFor="teamSearch">{isSearching ? "Searching..." : "Search teams by name"}</label>
            </div>
          )}

          {/* -- Search dropdown -- */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-44 overflow-y-auto rounded-2xl p-1 animate-fade-in"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(200, 230, 201, 0.1)",
              }}
            >
              {searchResults.map((team) => (
                <button key={team.id} type="button" onClick={() => handleSelectTeam(team)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200, 230, 201, 0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(200, 230, 201, 0.1)" }}
                  >
                    <span className="text-xs font-medium text-phosphor">{team.teamName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-solvent/70">{team.teamName}</p>
                    {team.description && (
                      <p className="truncate text-xs text-solvent/30">{team.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {isSearching && !selectedTeam && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-2xl p-4 text-center animate-fade-in"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.95), rgba(26, 31, 40, 0.9))",
                border: "1px solid rgba(200, 230, 201, 0.06)",
              }}
            >
              <span className="inline-block h-4 w-4 animate-spin rounded-full border border-phosphor border-t-transparent" />
            </div>
          )}
        </div>

        {/* -- isPrimary toggle -- */}
        <div className="mb-4 flex items-center justify-between rounded-2xl p-3"
          style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.04)" }}
        >
          <div>
            <p className="text-sm font-medium text-solvent/70">Primary team</p>
            <p className="text-xs text-solvent/30">Primary teams receive first routing priority</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPrimary(!isPrimary)}
            disabled={isSubmitting}
            className={`relative h-6 w-11 rounded-full transition-all duration-300 ${isPrimary ? "bg-phosphor/30" : "bg-solvent/5"}`}
            style={{ border: isPrimary ? "1px solid rgba(200, 230, 201, 0.2)" : "1px solid rgba(240, 244, 248, 0.06)" }}
            role="switch"
            aria-checked={isPrimary}
            aria-label="Toggle primary team"
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-all duration-300 ${isPrimary ? "translate-x-5 bg-phosphor" : "translate-x-0 bg-solvent/20"}`}
              style={{ boxShadow: isPrimary ? "0 0 8px rgba(200, 230, 201, 0.3)" : "none" }}
            />
          </button>
        </div>

        {/* -- Load Weight slider -- */}
        <div className="mb-6 rounded-2xl p-3"
          style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.04)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-solvent/70">Load weight</p>
            <span className="text-xs font-medium text-phosphor">{loadWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={loadWeight}
            onChange={(e) => setLoadWeight(parseFloat(e.target.value))}
            disabled={isSubmitting}
            className="w-full appearance-none rounded-full h-1.5 outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(200, 230, 201, 0.3) 0%, rgba(200, 230, 201, 0.3) ${(loadWeight / 5) * 100}%, rgba(240, 244, 248, 0.05) ${(loadWeight / 5) * 100}%, rgba(240, 244, 248, 0.05) 100%)`,
              accentColor: "var(--color-phosphor)",
            }}
            aria-label="Load weight"
          />
          <div className="mt-1 flex justify-between text-[10px] text-solvent/20">
            <span>0.1x (low)</span>
            <span>2.5x (balanced)</span>
            <span>5.0x (high)</span>
          </div>
        </div>

        {/* -- Buttons -- */}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isSubmitting}
            className="flex-1 rounded-full py-2.5 text-sm text-solvent/50 transition-all hover:text-solvent"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >Cancel</button>
          <button
            onClick={() => selectedTeam && onSubmit(selectedTeam.id, isPrimary, loadWeight)}
            disabled={isSubmitting || !selectedTeam}
            className="flex-1 rounded-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: isSubmitting || !selectedTeam ? "rgba(200, 230, 201, 0.05)" : "rgba(200, 230, 201, 0.15)",
              border: "1px solid rgba(200, 230, 201, 0.12)",
              color: isSubmitting || !selectedTeam ? "rgba(240, 244, 248, 0.2)" : "var(--color-phosphor)",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-phosphor border-t-transparent" />
                Mapping...
              </span>
            ) : selectedTeam ? "Map team" : "Select a team"}
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
  const [teamMappings, setTeamMappings] = useState<TeamMapping[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showMapTeam, setShowMapTeam] = useState(false);
  const [isMappingTeam, setIsMappingTeam] = useState(false);
  const [mapTeamError, setMapTeamError] = useState<string | null>(null);
  const [teamToUnmap, setTeamToUnmap] = useState<TeamMapping | null>(null);
  const [isUnmapping, setIsUnmapping] = useState(false);
  const [unmapError, setUnmapError] = useState<string | null>(null);

  const canUpdate = profile ? checkPermissions(auth, [Permissions.PRODUCT_UPDATE]).allowed : false;
  const canDelete = profile ? checkPermissions(auth, [Permissions.PRODUCT_DELETE]).allowed : false;

  // -- Fetch product & team mappings ----------------------------------------
  useEffect(() => {
    if (authLoading || !isAuthenticated || !productId) return;
    (async () => {
      setIsFetching(true);
      setError(null);
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [productRes, teamsRes] = await Promise.all([
          fetch(`/api/v1/products/${productId}`, { headers }),
          fetch(`/api/v1/products/${productId}/teams`, { headers }),
        ]);

        if (productRes.status === 404) { setError("Product not found"); setProduct(null); return; }
        if (!productRes.ok) throw new Error("Failed to fetch");

        const productBody = await productRes.json();
        setProduct(productBody.data ?? null);

        if (teamsRes.ok) {
          const teamsBody = await teamsRes.json();
          setTeamMappings(teamsBody.data ?? []);
        }
      } catch { setError("Failed to load product"); } finally { setIsFetching(false); }
    })();
  }, [productId, authLoading, isAuthenticated]);

  // -- Delete handler -------------------------------------------------------
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

  // -- Map team handler -----------------------------------------------------
  async function handleMapTeam(teamId: string, isPrimary: boolean, loadWeight: number) {
    setIsMappingTeam(true);
    setMapTeamError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/products/${productId}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ teamId, isPrimary, loadWeight }),
      });

      if (res.status === 404) {
        setMapTeamError("Team not found. Please try again.");
        setIsMappingTeam(false);
        return;
      }
      if (res.status === 409) {
        setMapTeamError("This team is already mapped to the product.");
        setIsMappingTeam(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to map team");

      // Re-fetch mappings
      const teamsRes = await fetch(`/api/v1/products/${productId}/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (teamsRes.ok) {
        const body = await teamsRes.json();
        setTeamMappings(body.data ?? []);
      }
      setShowMapTeam(false);
    } catch {
      setMapTeamError("Failed to map team. Please try again.");
    } finally {
      setIsMappingTeam(false);
    }
  }

  // -- Unmap team handler ---------------------------------------------------
  async function handleUnmapTeam() {
    if (!teamToUnmap) return;
    setIsUnmapping(true);
    setUnmapError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/v1/products/${productId}/teams?teamId=${teamToUnmap.teamId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed to unmap team");

      // Re-fetch mappings
      const teamsRes = await fetch(`/api/v1/products/${productId}/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (teamsRes.ok) {
        const body = await teamsRes.json();
        setTeamMappings(body.data ?? []);
      }
      setTeamToUnmap(null);
    } catch {
      setUnmapError("Failed to remove mapping. Please try again.");
    } finally {
      setIsUnmapping(false);
    }
  }

  // -- Auth gate ------------------------------------------------------------
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
        {/* -- Back link -- */}
        <button onClick={() => router.push("/products")}
          className="mb-6 flex items-center gap-2 text-sm text-solvent/30 transition-colors hover:text-phosphor"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to products
        </button>

        {/* -- Loading -- */}
        {isFetching ? (
          <div className="animate-pulse space-y-4 rounded-[2rem] p-8" style={{ background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))", border: "1px solid rgba(200, 230, 201, 0.04)" }}>
            <div className="h-5 w-2/5 rounded bg-bathyal/20" />
            <div className="h-14 w-full rounded bg-bathyal/10" />
            <div className="h-3 w-1/3 rounded bg-bathyal/10" />
          </div>
        ) : error ? (
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
          <>
            {/* -- Product detail halo -- */}
            <div className="animate-fade-in rounded-[2.5rem] p-6 sm:p-10"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.75), rgba(26, 31, 40, 0.65))",
                backdropFilter: "blur(32px) saturate(0.8)",
                border: "1px solid rgba(200, 230, 201, 0.06)",
              }}
            >
              <div className="pointer-events-none absolute top-0 left-[20%] right-[20%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(200, 230, 201, 0.12) 50%, transparent 100%)" }}
                aria-hidden="true"
              />

              {/* -- Header -- */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-medium text-solvent sm:text-3xl">{product.name}</h1>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase"
                      style={{
                        background: product.status === "active" ? "rgba(167, 243, 208, 0.08)" : "rgba(240, 244, 248, 0.03)",
                        border: product.status === "active" ? "1px solid rgba(167, 243, 208, 0.12)" : "1px solid rgba(240, 244, 248, 0.04)",
                        color: product.status === "active" ? "var(--color-aurora)" : "rgba(240, 244, 248, 0.25)",
                      }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: product.status === "active" ? "var(--color-aurora)" : "rgba(240, 244, 248, 0.15)",
                          boxShadow: product.status === "active" ? "0 0 6px rgba(167, 243, 208, 0.5)" : "none",
                        }}
                      />
                      {product.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tracking-wide text-solvent/20 uppercase">
                    <span>Created {new Date(product.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>Updated {new Date(product.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>{teamMappings.length} team{teamMappings.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {canUpdate && (
                    <button onClick={() => router.push(`/products/${product.id}/edit`)}
                      className="rounded-full p-2.5 text-solvent/25 transition-all duration-300 hover:bg-phosphor/10 hover:text-phosphor"
                      aria-label="Edit product"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setShowDeleteModal(true)}
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

              {/* -- Description -- */}
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

              {/* -- Product ID -- */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(10, 14, 20, 0.4)", border: "1px solid rgba(200, 230, 201, 0.03)" }}>
                <span className="text-[11px] font-medium tracking-wider text-solvent/20 uppercase">Product ID</span>
                <p className="mt-1 font-mono text-xs text-solvent/35">{product.id}</p>
              </div>
            </div>

            {/* -- Team Mappings Section -- */}
            <div className="mt-8 animate-fade-in rounded-[2.5rem] p-6 sm:p-8"
              style={{
                background: "linear-gradient(135deg, rgba(19, 26, 36, 0.6), rgba(26, 31, 40, 0.5))",
                border: "1px solid rgba(200, 230, 201, 0.06)",
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-solvent">Support teams</h2>
                  <p className="mt-0.5 text-xs text-solvent/30">
                    {teamMappings.length === 0
                      ? "No teams mapped yet"
                      : `${teamMappings.length} team${teamMappings.length !== 1 ? "s" : ""} assigned to handle complaints`}
                  </p>
                </div>
                {canUpdate && (
                  <button onClick={() => setShowMapTeam(true)}
                    className="btn-phosphor flex items-center gap-1.5 rounded-full px-4 py-2 text-xs"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden sm:inline">Map team</span>
                    <span className="sm:hidden">Map</span>
                  </button>
                )}
              </div>

              {teamMappings.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "rgba(200, 230, 201, 0.06)", border: "1px solid rgba(200, 230, 201, 0.06)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="7" r="4" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="rgba(200, 230, 201, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-solvent/30">No support teams mapped yet. Map teams to handle complaints.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamMappings.map((mapping) => (
                    <div key={mapping.teamId}
                      className="group flex items-center justify-between gap-3 rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:bg-phosphor/5"
                      style={{ background: "rgba(10, 14, 20, 0.3)", border: "1px solid rgba(200, 230, 201, 0.04)" }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300"
                          style={{
                            background: mapping.isPrimary
                              ? "rgba(200, 230, 201, 0.2)"
                              : "rgba(200, 230, 201, 0.08)",
                          }}
                        >
                          <span className="text-xs font-medium tracking-wide text-phosphor">
                            {mapping.teamName.charAt(0)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="truncate text-sm font-medium text-solvent/70">{mapping.teamName}</p>
                            {mapping.isPrimary && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
                                style={{ background: "rgba(200, 230, 201, 0.1)", color: "var(--color-phosphor)" }}
                              >
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-phosphor"
                                  style={{ boxShadow: "0 0 4px rgba(200, 230, 201, 0.5)" }}
                                />
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-solvent/25 font-mono">Load: {mapping.loadWeight.toFixed(1)}x</p>
                          </div>
                        </div>
                      </div>

                      {canUpdate && (
                        <button onClick={() => setTeamToUnmap(mapping)}
                          className="shrink-0 rounded-full p-2 text-solvent/15 transition-all duration-300 hover:bg-magma/10 hover:text-magma opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Unmap ${mapping.teamName}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* -- Delete Product Modal -- */}
      {showDeleteModal && product && (
        <DeleteModal productName={product.name} isDeleting={isDeleting} error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setDeleteError(null); }}
        />
      )}

      {/* -- Unmap Team Modal -- */}
      {teamToUnmap && (
        <UnmapTeamModal teamName={teamToUnmap.teamName} isUnmapping={isUnmapping} error={unmapError}
          onConfirm={handleUnmapTeam}
          onCancel={() => { setTeamToUnmap(null); setUnmapError(null); }}
        />
      )}

      {/* -- Map Team Modal -- */}
      <MapTeamModal
        isOpen={showMapTeam}
        isSubmitting={isMappingTeam}
        error={mapTeamError}
        mappedTeamIds={teamMappings.map((m) => m.teamId)}
        onClose={() => { setShowMapTeam(false); setMapTeamError(null); }}
        onSubmit={handleMapTeam}
      />
    </main>
  );
}
