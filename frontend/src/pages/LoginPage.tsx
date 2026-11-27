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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [resetNotice, setResetNotice] = useState("");

  if (getToken()) return <Navigate to="/dashboard" replace />;

  function validateForm() {
    const errors: FieldErrors = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!isResettingPassword) {
      if (!password) {
        errors.password = "Enter your password.";
      } else if (isRegistering && password.length < 8) {
        errors.password = "Password must be at least 8 characters long.";
      }
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
      if (isResettingPassword) {
        const message =
          "Password reset email is not connected yet. The recovery backend will be added after the demo.";
        setResetNotice(message);
        toast.info("Password recovery is coming soon.");
        return;
      }

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
        const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const loginData = await loginResponse.json();

        if (!loginResponse.ok || typeof loginData.access_token !== "string") {
          throw new Error(
            "Your account was created, but automatic log in failed. Please log in manually.",
          );
        }

        saveToken(loginData.access_token);
        toast.success("Your account is ready. You are now logged in.");
        navigate("/dashboard");
        return;
      }

      saveToken(data.access_token);
      toast.success("You are now logged in.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "A connection error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsRegistering((current) => !current);
    setIsResettingPassword(false);
    setFieldErrors({});
    setResetNotice("");
    setPassword("");
    setShowPassword(false);
  }

  function openPasswordReset() {
    setIsRegistering(false);
    setIsResettingPassword(true);
    setFieldErrors({});
    setResetNotice("");
    setPassword("");
    setShowPassword(false);
  }

  function returnToLogin() {
    setIsResettingPassword(false);
    setFieldErrors({});
    setResetNotice("");
    setShowPassword(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 size-[30rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-32 size-[34rem] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-border/70 bg-surface/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            <span className="size-2 rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)]" />
            Personal finance, made clearer
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
            Your money,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              in perspective.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
            Keep income and expenses organized, understand your habits, and make
            your next financial decision with more confidence.
          </p>

          <div className="mt-10 max-w-lg rounded-3xl border border-border/70 bg-surface/80 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">A clearer overview</p>
                <p className="mt-1 text-xs text-muted">
                  Your activity, organized in one place
                </p>
              </div>
              <span className="rounded-xl bg-accent/15 px-3 py-2 text-xs font-semibold text-accent">
                CASHFLOW
              </span>
            </div>
            <div className="mt-7 flex h-28 items-end gap-2" aria-hidden="true">
              {[38, 55, 44, 70, 51, 83, 64, 94, 72, 100, 78, 89].map(
                (height, index) => (
                  <span
                    key={index}
                    style={{ height: `${height}%` }}
                    className={`flex-1 rounded-t-md ${
                      index % 3 === 0 ? "bg-primary/80" : "bg-accent/70"
                    }`}
                  />
                ),
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
              {["Track activity", "Review trends", "Stay in control"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/70 px-3 py-1.5"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-md">
          <form
            noValidate
            onSubmit={submit}
            className="rounded-[2rem] border border-border/70 bg-surface/95 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-1 rounded-full bg-primary" />
              <p className="text-sm font-bold tracking-[0.22em] text-primary">
                CASHFLOW
              </p>
            </div>

            <h2 className="mt-8 text-3xl font-bold tracking-tight">
              {isResettingPassword
                ? "Reset your password"
                : isRegistering
                  ? "Create your account"
                  : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isResettingPassword
                ? "Enter your account email to get help recovering access."
                : isRegistering
                  ? "Start organizing your finances in one place."
                  : "Log in to see your financial overview."}
            </p>

            <label className="mb-2 mt-7 block text-sm font-medium" htmlFor="email">
              Email address
            </label>
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted"
              >
                <rect
                  x="3.5"
                  y="5.5"
                  width="17"
                  height="13"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="m5 7 7 5.5L19 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-text outline-none transition placeholder:text-muted/60 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20"
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby="email-hint email-error"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setResetNotice("");
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
              />
            </div>
            <p id="email-hint" className="mt-1.5 text-xs text-muted">
              Use the email address associated with your account.
            </p>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-danger">
                {fieldErrors.email}
              </p>
            )}

            {!isResettingPassword && (
              <>
                <div className="mb-2 mt-5 flex items-center justify-between gap-3">
                  <label className="text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  {!isRegistering && (
                    <button
                      type="button"
                      onClick={openPasswordReset}
                      className="cursor-pointer text-xs font-semibold text-accent transition hover:text-primary"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted"
                  >
                    <rect
                      x="4.5"
                      y="10"
                      width="15"
                      height="10"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V7.5a4 4 0 0 1 8 0V10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15" r="1" fill="currentColor" />
                  </svg>
                  <input
                    className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-12 text-text outline-none transition placeholder:text-muted/60 hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    placeholder={isRegistering ? "At least 8 characters" : "Your password"}
                    minLength={isRegistering ? 8 : undefined}
                    maxLength={128}
                    required
                    value={password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby="password-hint password-error"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]">
                        <path d="M3 3 21 21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        <path d="M2.5 12s3.4-6.5 9.5-6.5c1.5 0 2.8.4 4 1M21.5 12s-3.4 6.5-9.5 6.5c-1.5 0-2.8-.4-4-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[18px]">
                        <path d="M2 12c1.2-2.9 4.9-7 10-7s8.8 4.1 10 7c-1.2 2.9-4.9 7-10 7S3.2 14.9 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    )}
                  </button>
                </div>
                <p id="password-hint" className="mt-1.5 text-xs text-muted">
                  {isRegistering
                    ? "Choose a password with at least 8 characters."
                    : "Enter the password you used when you registered."}
                </p>
                {fieldErrors.password && (
                  <p id="password-error" className="mt-1 text-sm text-danger">
                    {fieldErrors.password}
                  </p>
                )}
              </>
            )}

            {isResettingPassword && (
              <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm leading-5 text-muted">
                Email recovery is being prepared. The reset link will work once
                the email backend is connected.
              </div>
            )}
            {resetNotice && (
              <p className="mt-3 text-sm text-primary" role="status">
                {resetNotice}
              </p>
            )}

            <button
              className="mt-7 w-full cursor-pointer rounded-xl bg-primary px-4 py-3.5 font-semibold text-background shadow-lg shadow-primary/15 transition duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-primary/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isResettingPassword
                  ? "Request reset link"
                  : isRegistering
                    ? "Create account"
                    : "Log in"}
            </button>

            <div className="mt-6 border-t border-border/70 pt-5 text-center text-sm text-muted">
              {isResettingPassword ? (
                <>
                  Remembered your password?{" "}
                  <button
                    className="cursor-pointer font-semibold text-primary transition hover:text-primary-hover"
                    type="button"
                    onClick={returnToLogin}
                  >
                    Back to log in
                  </button>
                </>
              ) : (
                <>
                  {isRegistering
                    ? "Already have an account?"
                    : "New to CashFlow?"}{" "}
                  <button
                    className="cursor-pointer font-semibold text-primary transition hover:text-primary-hover"
                    type="button"
                    onClick={switchMode}
                  >
                    {isRegistering ? "Log in" : "Create an account"}
                  </button>
                </>
              )}
            </div>
          </form>
          <p className="mt-5 text-center text-xs text-muted">
            Your financial workspace, designed around clarity.
          </p>
        </section>
      </div>
    </main>
  );
}
