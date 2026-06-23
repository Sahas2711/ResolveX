"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth, clearTokens } from "@/hooks/useAuth";

// -- Nav items --------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    color: "var(--color-phosphor)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 16l4-6 4 4 4-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Complaints",
    href: "/complaints",
    color: "var(--color-phosphor)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/products",
    color: "var(--color-aurora)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 9h8M8 13h6M8 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Teams",
    href: "/teams",
    color: "var(--color-bathyal)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/users",
    color: "var(--color-cosmic-dust)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

// -- App Navigation ---------------------------------------------------------

export default function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  const currentSection = pathname.split("/")[1] || "complaints";

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-40 transition-all duration-500"
      style={{
        background: "linear-gradient(180deg, rgba(10, 14, 20, 0.92), rgba(10, 14, 20, 0.7))",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(200, 230, 201, 0.04)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo + nav links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <div
              className="h-6 w-6 rounded-full"
              style={{
                background: "radial-gradient(circle at 40% 35%, rgba(200, 230, 201, 0.6), rgba(167, 243, 208, 0.3))",
                boxShadow: "0 0 10px rgba(200, 230, 201, 0.12)",
              }}
            />
            <span className="hidden text-sm font-medium tracking-tight text-solvent sm:inline">
              ResolveX
            </span>
          </button>

          {/* Section links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentSection === item.href.split("/")[1];
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300"
                  style={{
                    background: isActive ? "rgba(200, 230, 201, 0.06)" : "transparent",
                    color: isActive ? item.color : "rgba(240, 244, 248, 0.3)",
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.4 }}>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme toggle + user info + logout */}
        <div className="flex items-center gap-3">
          {profile && (
            <span className="hidden text-xs text-solvent/30 sm:inline">
              {profile.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide text-solvent/25 uppercase transition-all duration-300 hover:text-magma"
            style={{ border: "1px solid rgba(240, 244, 248, 0.06)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
