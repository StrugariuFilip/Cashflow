import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import PageLayout from "../components/PageLayout";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";

type UserProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_data: string | null;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

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
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setFirstNameDraft(data.first_name);
        setLastNameDraft(data.last_name);
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : "Could not load your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "";
  const initials = profile
    ? `${profile.first_name.slice(0, 1)}${profile.last_name.slice(0, 1)}`.toUpperCase() || "C"
    : "C";
  const visiblePhoto = previewUrl || profile?.avatar_data || "";

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("The profile photo must be 2 MB or smaller.");
      return;
    }

    setSelectedPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function savePhoto() {
    if (!selectedPhoto) return;
    setSavingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedPhoto);
      const response = await fetch(`${API_URL}/api/v1/users/me/avatar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not save your profile photo.");
      }
      setProfile(data as UserProfile);
      window.dispatchEvent(new CustomEvent("cashflow:avatar-updated", { detail: (data as UserProfile).avatar_data }));
      setSelectedPhoto(null);
      setPreviewUrl("");
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile photo.");
    } finally {
      setSavingPhoto(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function cancelPhotoSelection() {
    setSelectedPhoto(null);
    setPreviewUrl("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function startEditingDetails() {
    setFirstNameDraft(profile?.first_name ?? "");
    setLastNameDraft(profile?.last_name ?? "");
    setEditingDetails(true);
  }

  async function saveProfileDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstNameDraft.trim() || !lastNameDraft.trim()) {
      toast.error("Enter both your first and last name.");
      return;
    }
    setSavingDetails(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstNameDraft.trim(),
          last_name: lastNameDraft.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not save your profile details.");
      }
      const updatedProfile = data as UserProfile;
      setProfile(updatedProfile);
      setFirstNameDraft(updatedProfile.first_name);
      setLastNameDraft(updatedProfile.last_name);
      setEditingDetails(false);
      window.dispatchEvent(new CustomEvent("cashflow:profile-updated", {
        detail: `${updatedProfile.first_name} ${updatedProfile.last_name}`.trim(),
      }));
      toast.success("Profile details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile details.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function removePhoto() {
    setRemovingPhoto(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not remove your profile photo.");
      }
      setProfile((current) => current ? { ...current, avatar_data: null } : current);
      window.dispatchEvent(new CustomEvent("cashflow:avatar-updated", { detail: null }));
      cancelPhotoSelection();
      toast.success("Profile photo removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove your profile photo.");
    } finally {
      setRemovingPhoto(false);
    }
  }

  return (
    <PageLayout>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Your account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text">Profile</h1>
        <p className="mt-1.5 text-sm text-muted">Manage your personal details and profile photo.</p>
      </header>
      <div className="space-y-5">
        <section className="rounded-[26px] border border-border/70 bg-surface p-5 shadow-lg shadow-black/10 sm:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-background text-xl font-bold text-accent sm:size-24">
                {visiblePhoto ? (
                  <img src={visiblePhoto} alt={`${fullName || "Your"} profile`} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">CashFlow profile</p>
                <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-text">{loading ? "Loading…" : fullName || "Your account"}</h2>
                <p className="mt-1 truncate text-sm text-muted">{profile?.email ?? "Personal CashFlow account"}</p>
              </div>
            </div>

            <div className="md:ml-auto md:w-full md:max-w-md">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label="Choose a profile photo"
                onChange={(event) => choosePhoto(event.target.files?.[0])}
              />
              <p className="text-sm font-semibold text-text">Profile photo</p>
              <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP · up to 2 MB</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={savingPhoto || removingPhoto}
                  className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {profile?.avatar_data ? "Change photo" : "Add a photo"}
                </button>
                {profile?.avatar_data && !selectedPhoto && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={savingPhoto || removingPhoto}
                    className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingPhoto ? "Removing…" : "Remove"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectedPhoto && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{selectedPhoto.name}</p>
                <p className="mt-1 text-xs text-muted">Preview ready · {(selectedPhoto.size / 1024).toFixed(0)} KB</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={cancelPhotoSelection} disabled={savingPhoto} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-muted transition hover:text-text disabled:opacity-50">Cancel</button>
                <button type="button" onClick={savePhoto} disabled={savingPhoto} className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
                  {savingPhoto ? "Saving…" : "Save photo"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] text-accent" aria-hidden="true">✓</span>
            <p><span className="font-semibold text-text">Private account.</span> Your profile and transactions are visible only to you.</p>
          </div>
        </section>

        <section className="rounded-[26px] border border-border/70 bg-surface p-5 shadow-lg shadow-black/10 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Account information</p>
                <h3 className="mt-1 text-xl font-bold text-text">Personal details</h3>
                <p className="mt-1 text-sm text-muted">Update the name shown across your account.</p>
              </div>
              {!editingDetails && (
                <button type="button" onClick={startEditingDetails} disabled={loading || !profile} className="cursor-pointer rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50">
                  Edit details
                </button>
              )}
            </div>

            {editingDetails ? (
              <form className="mt-5" onSubmit={saveProfileDetails}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted">
                    First name
                    <input required maxLength={50} autoComplete="given-name" value={firstNameDraft} onChange={(event) => setFirstNameDraft(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </label>
                  <label className="text-xs font-semibold text-muted">
                    Last name
                    <input required maxLength={50} autoComplete="family-name" value={lastNameDraft} onChange={(event) => setLastNameDraft(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingDetails(false)} disabled={savingDetails} className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={savingDetails} className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">{savingDetails ? "Saving…" : "Save changes"}</button>
                </div>
              </form>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileField label="First name" value={profile?.first_name || (loading ? "Loading…" : "Not set")} />
                <ProfileField label="Last name" value={profile?.last_name || (loading ? "Loading…" : "Not set")} />
                <ProfileField label="Email address" value={profile?.email ?? (loading ? "Loading…" : "Unavailable")} />
              </div>
            )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link to="/transactions" className="group flex items-center gap-4 rounded-[22px] border border-border/70 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/5 sm:p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-lg font-bold text-accent" aria-hidden="true">↗</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text">Your transactions</span>
              <span className="mt-1 block text-xs leading-5 text-muted">Review and manage your income and expenses.</span>
            </span>
            <span className="ml-auto text-accent transition group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
          <Link to="/settings" className="group flex items-center gap-4 rounded-[22px] border border-border/70 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 sm:p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary" aria-hidden="true">⚙</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text">Account settings</span>
              <span className="mt-1 block text-xs leading-5 text-muted">Personalize the look and feel of CashFlow.</span>
            </span>
            <span className="ml-auto text-primary transition group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </PageLayout>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-4 transition hover:border-accent/25">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-text">{value}</p>
    </div>
  );
}
