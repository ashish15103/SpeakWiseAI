import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SignOutModal } from "./SignOutModal";

import {
  Brain,
  LayoutDashboard,
  Mic,
  MessageSquare,
  LogOut,
  ChevronDown,
  User,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  SquarePen,
} from "lucide-react";

import { supabase } from "../integrations/supabase/client";

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Doubt Solver",
    to: "/doubt-solver",
    icon: Brain,
  },
  {
    label: "Mock Interview",
    to: "/mock-interview",
    icon: Mic,
  },
  {
    label: "Communication",
    to: "/communication",
    icon: MessageSquare,
  },
] as const;

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type AppUser = {
  name: string;
  email: string;
  avatarUrl?: string;
};

type FeatureSlotProps = {
  searchQuery: string;
};

type Props = {
  user: AppUser;
  featureSlot?: ReactNode | ((props: FeatureSlotProps) => ReactNode);
  onNewChat?: () => void;
};

// ─────────────────────────────────────────────────────────────
// APP SIDEBAR
// ─────────────────────────────────────────────────────────────

export function AppSidebar({ user, featureSlot, onNewChat }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────
  // SIDEBAR STATE
  // ─────────────────────────────────────────────────────────────

  const SIDEBAR_BREAKPOINT = 1100;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    // Large / fullscreen → open
    // Split screen / smaller width → collapsed
    return window.innerWidth < SIDEBAR_BREAKPOINT;
  });

  const [profileOpen, setProfileOpen] = useState(false);
  // State variable to control
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────
  // RESPONSIVE SIDEBAR
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= SIDEBAR_BREAKPOINT) {
        // Desktop / large screens → normal sidebar
        setIsCollapsed(false);
      } else if (window.innerWidth >= 768) {
        // Tablet / split screen → existing compact sidebar
        setIsCollapsed(true);
      } else {
        // Mobile → sidebar closed, hamburger will control it
        setIsCollapsed(true);
        setSearchOpen(false);
        setProfileOpen(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUTO FOCUS SEARCH
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  // ─────────────────────────────────────────────────────────────
  // CLOSE PROFILE ON OUTSIDE CLICK
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const clickedDesktopProfile =
        profileRef.current?.contains(target) ?? false;
      const clickedMobileProfile =
        mobileProfileRef.current?.contains(target) ?? false;

      if (!clickedDesktopProfile && !clickedMobileProfile) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  // ─────────────────────────────────────────────────────────────
  // USER INITIALS
  // ─────────────────────────────────────────────────────────────

  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─────────────────────────────────────────────────────────────
  // FEATURE SLOT
  // ─────────────────────────────────────────────────────────────

  const renderedFeatureSlot =
    typeof featureSlot === "function"
      ? featureSlot({ searchQuery })
      : featureSlot;

  // ─────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────

  function openSearch() {
    setIsCollapsed(false);
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  // ─────────────────────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          aria-label="Open menu"
          className="fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/95 text-gray-700 shadow-md backdrop-blur-md transition-all hover:bg-white hover:shadow-lg md:hidden dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          <span className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      )}

      {/* ── MOBILE PROFILE ─────────────────────────────────────────────── */}
      <div className="fixed right-4 top-4 z-[70] flex items-center gap-2 md:hidden">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="New chat"
            title="New chat"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200/80 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 dark:bg-gray-900/95 dark:text-gray-200 dark:ring-gray-800"
          >
            <SquarePen className="h-[18px] w-[18px]" />
          </button>
        )}

        <div ref={mobileProfileRef} className="relative md:hidden">
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-gray-200/80 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 dark:bg-gray-900/95 dark:ring-gray-800"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-[11px] font-bold text-white">
                {initials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.05] dark:bg-gray-900 dark:ring-white/[0.07]">
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                  {user.email}
                </p>
              </div>

              <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <User className="h-4 w-4 text-gray-400" />
                View Profile
              </Link>

              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </Link>

              <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setIsSignOutOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div
          onClick={() => {
            setIsCollapsed(true);
            setSearchOpen(false);
            setProfileOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        className={`z-50 flex h-[100svh] flex-col overflow-visible bg-white dark:bg-gray-950
    md:relative md:z-20 md:h-screen md:shrink-0
    max-md:fixed max-md:left-0 max-md:top-0 max-md:w-[272px]
    max-md:shadow-2xl
    ${isCollapsed ? "w-[56px]" : "w-[272px]"}
    ${isCollapsed ? "max-md:-translate-x-full" : "max-md:translate-x-0"}
    transition-[width,transform] duration-300 ease-in-out
  `}
      >
        {/* Soft Gemini-like glow */}

        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-violet-200/50 to-transparent dark:via-violet-700/30" />

        <div className="pointer-events-none absolute -right-8 top-0 h-full w-8 bg-gradient-to-r from-violet-100/20 to-transparent blur-xl dark:from-violet-900/10" />

        {/* ───────────────── HEADER ───────────────── */}
        <button
          onClick={() => {
            setIsCollapsed(true);
            setSearchOpen(false);
            setProfileOpen(false);
          }}
          aria-label="Close menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 md:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`flex h-[72px] shrink-0 items-center ${
            isCollapsed ? "justify-center" : "justify-between px-4"
          }`}
        >
          {/* EXPANDED BRAND */}

          {!isCollapsed && (
            <Link to="/dashboard" className="min-w-0">
              <span className="whitespace-nowrap text-[17px] font-bold tracking-tight text-gray-900 dark:text-white">
                Speak
                <span className="text-violet-600">Wise</span>
                <span className="ml-1 font-normal text-gray-400">AI</span>
              </span>
            </Link>
          )}

          {/* COLLAPSED OPEN BUTTON */}

          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <PanelLeftOpen className="h-[19px] w-[19px]" />
            </button>
          )}

          {/* EXPANDED ACTIONS */}

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={openSearch}
                title="Search chats"
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  searchOpen
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              <button
                onClick={() => {
                  setIsCollapsed(true);
                  closeSearch();
                  setProfileOpen(false);
                }}
                title="Collapse sidebar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <PanelLeftClose className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>

        {/* ───────────────── SEARCH ───────────────── */}

        {!isCollapsed && searchOpen && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-900">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />

              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search chats..."
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100"
              />

              <button
                onClick={closeSearch}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────── MAIN CONTENT ───────────────── */}

        {isCollapsed ? (
          <>
            {/* COMPACT NAVIGATION */}

            <div className="flex flex-1 flex-col items-center gap-2 pt-4">
              {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
                const active =
                  to === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(to);

                return (
                  <Link
                    key={to}
                    to={to}
                    title={label}
                    className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-900/30 dark:text-violet-300"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px]" />

                    {active && (
                      <span className="absolute -right-1 h-1.5 w-1.5 rounded-full bg-violet-500" />
                    )}
                  </Link>
                );
              })}

              {/* SEARCH IN COLLAPSED MODE */}

              {featureSlot && (
                <button
                  onClick={openSearch}
                  title="Search chats"
                  className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <Search className="h-[19px] w-[19px]" />
                </button>
              )}
            </div>

            {/* COMPACT PROFILE */}

            <div className="flex shrink-0 justify-center pb-4 pt-3">
              <button
                onClick={() => {
                  setIsCollapsed(false);
                  setProfileOpen(true);
                }}
                title={user.name}
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-gray-950"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-[11px] font-bold text-white shadow-sm">
                    {initials}
                  </div>
                )}

                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* SCROLL AREA */}

            <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {/* WORKSPACE */}

              <nav className="space-y-1 px-3 pb-4 pt-3">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600">
                  Workspace
                </p>

                {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
                  const active =
                    to === "/dashboard"
                      ? location.pathname === "/dashboard"
                      : location.pathname.startsWith(to);

                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-violet-50 text-violet-700 shadow-[0_4px_18px_rgba(124,58,237,0.06)] dark:bg-violet-900/25 dark:text-violet-300"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-gray-100"
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                        }`}
                      />

                      <span className="min-w-0 flex-1">{label}</span>

                      {active && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* FEATURE SLOT */}

              {renderedFeatureSlot && (
                <>
                  <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-800" />

                  <div className="min-h-[420px]">{renderedFeatureSlot}</div>
                </>
              )}
            </div>

            {/* ───────────────── PROFILE ───────────────── */}

            <div className="relative shrink-0 px-3 pb-4 pt-3">
              <div className="flex items-center gap-2">
                <div ref={profileRef} className="relative min-w-0 flex-1">
                  <button
                    onClick={() => setProfileOpen((value) => !value)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    {/* AVATAR */}

                    <div className="relative shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-9 w-9 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-[11px] font-bold text-white shadow-sm">
                          {initials}
                        </div>
                      )}

                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
                    </div>

                    {/* USER INFO */}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {user.name}
                      </p>

                      <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                        {user.email}
                      </p>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                        profileOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* PROFILE DROPDOWN */}

                  {profileOpen && (
                    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] dark:bg-gray-900 dark:ring-white/[0.06]">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        View Profile
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Settings
                      </Link>

                      <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

                      <button
                        onClick={() => setIsSignOutOpen(true)}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ───────────────── SCROLLBAR STYLES ───────────────── */}

        <style>{`
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.35);
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>
        <SignOutModal
          isOpen={isSignOutOpen}
          onClose={() => {
            setIsSignOutOpen(false);
          }}
          onConfirm={async () => {
            setIsSignOutOpen(false);
            await handleLogout();
          }}
        />
      </aside>
    </>
  );
}
