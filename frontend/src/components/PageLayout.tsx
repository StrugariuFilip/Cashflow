import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { clearToken } from "../lib/auth";

export default function PageLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    toast.success("Te-ai deconectat.");
    navigate("/login");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-text">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            CASHFLOW
          </Link>

          <nav className="flex items-center gap-5 text-sm">
            <Link
              className="text-muted transition hover:text-accent"
              to="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="text-muted transition hover:text-accent"
              to="/transactions"
            >
              Tranzacții
            </Link>
            <button
              className="rounded-lg border border-border px-3 py-2 transition hover:border-accent hover:text-accent"
              onClick={logout}
            >
              Deconectare
            </button>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}