import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import {
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  ChevronDown,
} from "lucide-react";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/doubt-solver", label: "Doubt Solver" },
  { href: "/mock-interview", label: "Mock Interview" },
  { href: "/communication", label: "Communication" },
  { href: "/project-details", label: "Project" },
  { href: "/about", label: "About" },
];

const authedLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/doubt-solver", label: "Doubt Solver" },
  { href: "/mock-interview", label: "Mock Interview" },
  { href: "/communication", label: "Communication" },
];

export function SiteHeader() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("Student");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    async function updateUserData(currentUser: any) {
      if (!currentUser) {
        setUser(null);
        setDisplayName("Student");
        setAvatarUrl("");
        return;
      }

      setUser(currentUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      setDisplayName(
        profile?.display_name ||
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          "Student",
      );

      setAvatarUrl(profile?.avatar_url || "");
    }

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      await updateUserData(currentUser);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: unknown, session: { user: any } | null) => {
        updateUserData(session?.user ?? null);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();

    setProfileOpen(false);
    setMobileOpen(false);

    window.location.href = "/";
  }

  const links = user ? authedLinks : publicLinks;

  const initial = (displayName || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-elegant">
            <Sparkles className="h-5 w-5" />
          </span>

          <span className="text-lg tracking-tight">
            SpeakWise
            <span className="text-gradient-brand"> AI</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop User Section */}
        <div className="relative hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-3 text-sm transition hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-xs font-semibold text-brand-foreground">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </span>

                <span className="max-w-[140px] truncate text-muted-foreground">
                  {displayName}
                </span>

                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border bg-white p-2 shadow-xl">
                  <div className="border-b px-3 py-2">
                    <p className="truncate text-sm font-semibold">
                      {displayName}
                    </p>

                    {user?.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>

                  <a
                    href="/dashboard"
                    className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </a>

                  <a
                    href="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </a>

                  <div className="my-1 border-t" />

                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <a
                href="/auth"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-gray-100"
              >
                Sign in
              </a>

              <a
                href="/auth"
                className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
              >
                Get started
              </a>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="flex flex-col gap-1 p-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-gray-100"
              >
                {link.label}
              </a>
            ))}

            {user && (
              <>
                <a
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-100"
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </a>

                <div className="mt-2 border-t pt-2">
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}

            {!user && (
              <div className="mt-2 border-t pt-3">
                <a
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full rounded-lg bg-gradient-brand px-3 py-2.5 text-center text-sm font-medium text-brand-foreground hover:opacity-90"
                >
                  Sign in / Get started
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
