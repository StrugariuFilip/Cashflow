import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";

type UserProfile = { id: number; email: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(typeof data.detail === "string" ? data.detail : "Could not load your profile.");
        }
        return data as UserProfile;
      })
      .then((data) => { if (active) setProfile(data); })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : "Could not load your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const initials = profile?.email.slice(0, 1).toUpperCase() ?? "C";

  return (
    <PageLayout>
      <PageHeading eyebrow="Your account" title="Profile" description="Your CashFlow account details." />
      <section className="mt-6 max-w-3xl overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-black/10">
        <div className="h-28 bg-gradient-to-r from-primary/25 via-accent/20 to-chart-1/25" />
        <div className="px-6 pb-7 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex size-20 items-center justify-center rounded-2xl border-4 border-surface bg-primary text-3xl font-bold text-background shadow-lg shadow-primary/20">{initials}</div>
            <span className="mb-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">Active account</span>
          </div>
          <h2 className="mt-5 text-xl font-bold">{loading ? "Loading profile…" : profile?.email ?? "Profile unavailable"}</h2>
          <p className="mt-1 text-sm text-muted">Personal CashFlow account</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <ProfileField label="Email address" value={profile?.email ?? (loading ? "Loading…" : "Unavailable")} />
            <ProfileField label="Account ID" value={profile ? `#${profile.id}` : (loading ? "Loading…" : "—")} />
          </div>
          <div className="mt-6 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted">
            Your transactions are private and can only be accessed by your account.
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p></header>;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/70 p-4"><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 truncate text-sm font-semibold text-text">{value}</p></div>;
}
