import { useState } from "react";

import PageLayout from "../components/PageLayout";
import { applyTheme, getSavedTheme, type ColorTheme } from "../lib/preferences";

const themes: {
  id: ColorTheme;
  name: string;
  description: string;
  colors: [string, string, string, string];
}[] = [
  {
    id: "flamingo",
    name: "Electric plum",
    description: "Orange · violet · blue",
    colors: ["#ff8a2b", "#7827ff", "#5b8dff", "#ff8a2b"],
  },
  {
    id: "violet",
    name: "Violet night",
    description: "Lavender · blue · rose",
    colors: ["#b78afa", "#5b8dff", "#ff6b8a", "#b78afa"],
  },
  {
    id: "blue",
    name: "Blue hour",
    description: "Cyan · royal blue · mint",
    colors: ["#22d3ee", "#3155e7", "#45d6a0", "#22d3ee"],
  },
  {
    id: "neon",
    name: "Neon pop",
    description: "Hot pink · cyan · acid lime",
    colors: ["#ff3d8d", "#00d7e9", "#b3f000", "#ff3d8d"],
  },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(getSavedTheme);
  const activeTheme = themes.find((theme) => theme.id === selectedTheme) ?? themes[0];

  function chooseTheme(theme: ColorTheme) {
    setSelectedTheme(theme);
    applyTheme(theme);
  }

  return (
    <PageLayout>
      <header className="mb-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Preferences</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Make CashFlow feel like yours.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <section className="relative min-h-[390px] overflow-hidden rounded-[28px] border border-border/80 bg-surface p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: activeTheme.colors[1] }} />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Accent preview</p>
            <h2 className="mt-2 text-2xl font-bold text-text">{activeTheme.name}</h2>
            <p className="mt-1 text-sm text-muted">{activeTheme.description}</p>

            <div className="mt-8 rounded-2xl border border-border/80 bg-background/70 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted">Your finances</p>
                  <p className="mt-1 text-lg font-semibold text-text">A clearer view</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl text-lg text-white" style={{ backgroundColor: activeTheme.colors[1] }} aria-hidden="true">✦</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Income", color: activeTheme.colors[0], height: "h-10" },
                  { label: "Spending", color: activeTheme.colors[1], height: "h-16" },
                  { label: "Balance", color: activeTheme.colors[2], height: "h-12" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/70 bg-surface p-3">
                    <span className="block h-1.5 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="mt-4 flex h-16 items-end">
                      <span className={`block w-full rounded-t-md ${item.height}`} style={{ backgroundColor: item.color, opacity: 0.88 }} />
                    </div>
                    <p className="mt-2 text-[11px] text-muted">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: activeTheme.colors[0] }}>Primary action</button>
                <span className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: activeTheme.colors[1], color: activeTheme.colors[1] }}>Accent detail</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted">This preview updates when you select a palette.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/80 bg-surface p-5 sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Choose a palette</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Changes apply immediately across CashFlow.</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">{activeTheme.name}</span>
          </div>

          <div className="space-y-2">
            {themes.map((theme) => {
              const active = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseTheme(theme.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-accent/60 bg-accent/5" : "border-transparent hover:border-border hover:bg-background/50"}`}
                >
                  <span className="flex shrink-0 gap-1.5 rounded-full border border-border/70 bg-background/70 p-1.5">
                    {theme.colors.slice(0, 3).map((color) => <span key={color} className="size-4 rounded-full" style={{ backgroundColor: color }} />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text">{theme.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{theme.description}</span>
                  </span>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${active ? "border-accent bg-accent text-white" : "border-border text-transparent"}`} aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 border-t border-border/70 pt-4 text-xs text-muted">Switch light or dark mode from the top bar.</p>
        </section>
      </div>
    </PageLayout>
  );
}
