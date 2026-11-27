import { useState } from "react";

import PageLayout from "../components/PageLayout";
import { applyMode, applyTheme, getSavedMode, getSavedTheme, type ColorMode, type ColorTheme } from "../lib/preferences";

const themes: { id: ColorTheme; name: string; description: string; colors: string[] }[] = [
  { id: "flamingo", name: "Electric plum", description: "Deep plum with electric violet and amber.", colors: ["#15121d", "#7827ff", "#ff8a2b"] },
  { id: "violet", name: "Violet night", description: "Deep plum with soft violet and electric blue.", colors: ["#15121d", "#b78afa", "#5b8dff"] },
  { id: "blue", name: "Blue hour", description: "Deep plum with sky blue and violet.", colors: ["#15121d", "#38bdf8", "#7827ff"] },
];

export default function SettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(getSavedTheme);
  const [mode, setMode] = useState<ColorMode>(getSavedMode);

  function chooseTheme(theme: ColorTheme) {
    setSelectedTheme(theme);
    applyTheme(theme);
  }

  function chooseMode(nextMode: ColorMode) {
    setMode(nextMode);
    applyMode(nextMode);
  }

  return (
    <PageLayout>
      <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Make it yours</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted">Choose the color accents used across CashFlow.</p>
      </header>

      <section className="mt-6 max-w-4xl rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/10 sm:p-8">
        <div>
          <h2 className="text-lg font-bold">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Choose a display mode and accent palette.</p>
        </div>
        <div className="mt-4 inline-flex rounded-xl border border-border bg-background p-1">
          {(["dark", "light"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={mode === option} onClick={() => chooseMode(option)} className={`cursor-pointer rounded-lg px-4 py-2 text-sm capitalize transition ${mode === option ? "bg-accent text-white shadow" : "text-muted hover:text-text"}`}>{option} mode</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {themes.map((theme) => {
            const active = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                onClick={() => chooseTheme(theme.id)}
                className={`cursor-pointer rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active ? "border-accent bg-accent/5 ring-2 ring-accent/20" : "border-border hover:border-accent/50"}`}
              >
                <div className="flex h-24 items-end gap-2 overflow-hidden rounded-xl border border-white/10 p-3" style={{ backgroundColor: theme.colors[0] }}>
                  <span className="h-10 w-1/3 rounded-t-lg" style={{ backgroundColor: theme.colors[1] }} />
                  <span className="h-14 w-1/3 rounded-t-lg" style={{ backgroundColor: theme.colors[2] }} />
                  <span className="mb-1 ml-auto size-4 rounded-full border-2 border-white/70" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-semibold">{theme.name}</span>
                  {active && <span className="text-xs font-semibold text-accent">Selected</span>}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">{theme.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 max-w-4xl rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-bold">Security</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Your session ends automatically when your sign-in token expires. You can also log out from the sidebar at any time.</p>
      </section>
    </PageLayout>
  );
}
