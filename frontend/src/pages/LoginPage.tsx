import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";

import { API_URL } from "../lib/api";
import { getToken, saveToken } from "../lib/auth";

type FieldErrors = {
  email?: string;
  password?: string;
};

function getApiErrorMessage(detail: unknown): string | null {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null || !("msg" in item)) {
          return null;
        }

        return typeof item.msg === "string" ? item.msg : null;
      })
      .filter((message): message is string => message !== null);

    return messages.length > 0 ? messages.join(" ") : null;
  }

  return null;
}

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
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Enter your password.";
    } else if (isRegistering && password.length < 8) {
      errors.password = "Password must be at least 8 characters long.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Please check the highlighted fields.");
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
          throw new Error("An account with this email address already exists.");
        }

        if (response.status === 401) {
          throw new Error("The email or password is incorrect.");
        }

        throw new Error(
          getApiErrorMessage(data.detail) ??
            "Could not process the request. Please check the information you entered.",
        );
      }

      if (isRegistering) {
        toast.success("Your account has been created. You can now log in.");
        setIsRegistering(false);
        setPassword("");
      } else {
        saveToken(data.access_token);
        toast.success("You are now logged in.");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "A connection error occurred.");
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
          {isRegistering ? "Create an account" : "Log in"}
        </h1>

        <p className="mt-2 text-muted">
          {isRegistering
            ? "Sign up to get started."
            : "Log in to view your financial overview."}
        </p>

        <label className="mb-2 mt-8 block text-sm" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none focus:border-accent"
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby="email-hint email-error"
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
        />
        <p id="email-hint" className="mt-1 text-xs text-muted">
          Use the email address associated with your account.
        </p>
        {fieldErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-danger">
            {fieldErrors.email}
          </p>
        )}

        <label className="mb-2 mt-5 block text-sm" htmlFor="password">
          Password
        </label>
        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text outline-none focus:border-accent"
          id="password"
          type="password"
          autoComplete={isRegistering ? "new-password" : "current-password"}
          placeholder={isRegistering ? "At least 8 characters" : "Your password"}
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
            ? "Choose a password with at least 8 characters."
            : "Enter the password you used when you registered."}
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
            ? "Processing..."
            : isRegistering
              ? "Sign up"
              : "Log in"}
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className="font-semibold text-primary hover:text-primary-hover"
            type="button"
            onClick={switchMode}
          >
            {isRegistering ? "Log in" : "Create an account"}
          </button>
        </p>
      </form>
    </main>
  );
}
