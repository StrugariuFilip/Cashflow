import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";

import { API_URL } from "../lib/api";
import { getToken, saveToken } from "../lib/auth";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  if (getToken()) return <Navigate to="/dashboard" replace />;

  function validateForm() {
    const errors: FieldErrors = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Introdu o adresă de email validă.";
    }

    if (!password) {
      errors.password = "Introdu parola.";
    } else if (isRegistering && password.length < 8) {
      errors.password = "Parola trebuie să aibă cel puțin 8 caractere.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Verifică informațiile marcate din formular.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? "register" : "login";
      const response = await fetch(`${API_URL}/api/v1/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Există deja un cont cu această adresă de email.");
        }

        if (response.status === 401) {
          throw new Error("Emailul sau parola nu sunt corecte.");
        }

        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Nu am putut procesa cererea. Verifică datele introduse.",
        );
      }

      if (isRegistering) {
        toast.success("Contul a fost creat. Te poți autentifica acum.");
        setIsRegistering(false);
        setPassword("");
      } else {
        saveToken(data.access_token);
        toast.success("Te-ai autentificat.");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare de conectare.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsRegistering((current) => !current);
    setFieldErrors({});
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <form
        noValidate
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-border/50 bg-surface p-8 shadow-2xl"
      >
        <p className="text-sm font-semibold tracking-[0.25em] text-primary">
          CASHFLOW
        </p>

        <h1 className="mt-5 text-3xl font-bold">
          {isRegistering ? "Creează un cont" : "Autentificare"}
        </h1>

        <p className="mt-2 text-muted">
          {isRegistering
            ? "Înregistrează-te pentru a începe."
            : "Conectează-te pentru a-ți vedea situația financiară."}
        </p>

        <label className="mb-2 mt-8 block text-sm" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none focus:border-accent"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nume@exemplu.ro"
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby="email-hint email-error"
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
        />
        <p id="email-hint" className="mt-1 text-xs text-muted">
          Folosește adresa de email a contului tău.
        </p>
        {fieldErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-danger">
            {fieldErrors.email}
          </p>
        )}

        <label className="mb-2 mt-5 block text-sm" htmlFor="password">
          Parolă
        </label>
        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none focus:border-accent"
          id="password"
          type="password"
          autoComplete={isRegistering ? "new-password" : "current-password"}
          placeholder={isRegistering ? "Minimum 8 caractere" : "Parola contului"}
          value={password}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby="password-hint password-error"
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
        />
        <p id="password-hint" className="mt-1 text-xs text-muted">
          {isRegistering
            ? "Alege o parolă de cel puțin 8 caractere."
            : "Introdu parola folosită la înregistrare."}
        </p>
        {fieldErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-danger">
            {fieldErrors.password}
          </p>
        )}

        <button
          className="mt-7 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-background transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading
            ? "Se procesează..."
            : isRegistering
              ? "Înregistrează-te"
              : "Intră în cont"}
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegistering ? "Ai deja cont?" : "Nu ai cont?"}{" "}
          <button
            className="font-semibold text-primary hover:text-primary-hover"
            type="button"
            onClick={switchMode}
          >
            {isRegistering ? "Autentifică-te" : "Creează cont"}
          </button>
        </p>
      </form>
    </main>
  );
}