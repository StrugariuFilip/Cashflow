import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { clearToken } from "../lib/auth";
import { getToken } from "../lib/auth";
import { API_URL } from "../lib/api";
import { applyMode, getSavedMode, type ColorMode } from "../lib/preferences";

export default function PageLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mode, setMode] = useState<ColorMode>(getSavedMode);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => setSearch(searchParams.get("search") ?? ""), [searchParams]);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((response) => response.ok ? response.json() as Promise<{ email?: string }> : null)
      .then((profile) => {
        if (!active || !profile?.email) return;
        const username = profile.email.split("@")[0].split(/[._-]+/).filter(Boolean);
        setDisplayName(username.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  function logout() {
    clearToken();
    toast.success("You have been logged out.");
    navigate("/login");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (location.pathname !== "/transactions") {
      navigate(query ? `/transactions?search=${encodeURIComponent(query)}` : "/transactions");
      return;
    }
    if (query) setSearchParams({ search: query });
    else setSearchParams({});
  }

  function toggleMode() {
    const next: ColorMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  }

  const subtitle = location.pathname === "/dashboard"
    ? "Here is your financial overview."
    : location.pathname === "/transactions"
      ? "Review and manage your activity."
      : location.pathname === "/profile"
        ? "Your CashFlow account details."
        : "Personalize your CashFlow experience.";

  return (
    <main className="min-h-screen bg-background text-text lg:flex">
      <aside className="flex shrink-0 flex-col justify-between bg-[#100c14] px-4 py-4 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[230px] lg:px-5 lg:py-7">
        <div>
          <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-wide">CashFlow</span>
          </Link>
          <p className="mb-2 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Menu</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <SidebarLink to="/dashboard" kind="dashboard" label="Dashboard" />
            <SidebarLink to="/transactions" kind="transactions" label="Transactions" />
          </nav>
          <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">General</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <SidebarLink to="/profile" kind="profile" label="Profile" />
            <SidebarLink to="/settings" kind="settings" label="Settings" />
          </nav>
        </div>

        <div className="sidebar-promo mt-5 hidden rounded-2xl border p-4 lg:block">
          <span className="sidebar-promo-icon flex size-8 items-center justify-center rounded-lg"><NavIcon kind="spark" /></span>
          <p className="mt-5 text-sm font-semibold">Money, in focus</p>
          <p className="mt-1 text-xs leading-5 text-white/55">A clearer picture of your income and spending.</p>
        </div>
        <button className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/60 transition hover:bg-white/5 hover:text-white" onClick={logout}>
          <NavIcon kind="logout" /> Log out
        </button>
      </aside>

      <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-surface/90 px-4 py-3 shadow-sm sm:px-5">
            <div className="min-w-[170px]">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Welcome back{displayName ? `, ${displayName}` : ""} 👋</h1>
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
              <form onSubmit={submitSearch} className="relative hidden w-full max-w-[310px] sm:block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><NavIcon kind="search" /></span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions…" aria-label="Search transactions" className="w-full rounded-xl border border-border bg-background px-10 py-2.5 text-sm text-text outline-none transition placeholder:text-muted/65 focus:border-accent focus:ring-2 focus:ring-accent/20" />
                {search && <button type="button" onClick={() => { setSearch(""); if (location.pathname === "/transactions") setSearchParams({}); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-text">×</button>}
              </form>
              <div className="relative">
                <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted transition hover:border-accent/50 hover:text-text">
                  <NavIcon kind="bell" />
                </button>
                {notificationsOpen && <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-border bg-surface p-4 shadow-2xl"><p className="text-sm font-semibold">Notifications</p><p className="mt-2 text-xs leading-5 text-muted">You’re all caught up. New account and transaction alerts will appear here.</p><button onClick={() => setNotificationsOpen(false)} className="mt-3 cursor-pointer text-xs font-semibold text-accent">Close</button></div>}
              </div>
              <button type="button" onClick={toggleMode} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`} className="flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-border bg-background p-1 text-muted transition hover:text-text">
                <span className={`flex size-7 items-center justify-center rounded-lg ${mode === "light" ? "bg-accent/15 text-accent" : ""}`}><NavIcon kind="sun" /></span>
                <span className={`flex size-7 items-center justify-center rounded-lg ${mode === "dark" ? "bg-accent/15 text-accent" : ""}`}><NavIcon kind="moon" /></span>
              </button>
              <Link to="/profile" aria-label="Open profile" title="Open profile" className="group flex size-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/30 to-primary/30 text-text transition hover:ring-2 hover:ring-accent/40">
                <span className="flex size-full items-center justify-center bg-background/50"><NavIcon kind="profile" /></span>
              </Link>
            </div>
          </header>
          <div className="sm:hidden">
            <form onSubmit={submitSearch} className="relative mb-5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><NavIcon kind="search" /></span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions…" aria-label="Search transactions" className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-text outline-none placeholder:text-muted/65 focus:border-accent" />
            </form>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function SidebarLink({ to, kind, label }: { to: string; kind: "dashboard" | "transactions" | "profile" | "settings"; label: string }) {
  return <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition ${isActive ? "bg-white/10 font-medium text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><NavIcon kind={kind} />{label}</NavLink>;
}

function BrandMark() {
  return <span className="flex size-9 items-center justify-center rounded-xl border border-white/25 bg-white/5 text-white"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5"><circle cx="12" cy="12" r="9"/><path d="M7 12h10M9 9h6M9 15h6"/><path d="M12 3v2m0 14v2"/></svg></span>;
}

function NavIcon({ kind }: { kind: "dashboard" | "transactions" | "profile" | "settings" | "logout" | "search" | "bell" | "sun" | "moon" | "spark" }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    transactions: <><path d="M5 7h14M5 12h14M5 17h9"/><circle cx="3" cy="7" r=".5"/><circle cx="3" cy="12" r=".5"/><circle cx="3" cy="17" r=".5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.2 1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.2a7 7 0 0 1-.1 1.8Z" transform="translate(-1 -1) scale(1.08)"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
    spark: <><path d="m12 3 1.5 6 5.5 3-5.5 2.5L12 21l-2-6.5L4 12l6-3 2-6Z"/><path d="m19 3 .6 2.4L22 6l-2.4.6L19 9l-.6-2.4L16 6l2.4-.6L19 3Z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0">{paths[kind]}</svg>;
}
