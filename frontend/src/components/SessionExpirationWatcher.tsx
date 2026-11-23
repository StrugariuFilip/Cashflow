import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { clearToken, getToken } from "../lib/auth";

function getExpirationTime(token: string): number | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");

    const payload = JSON.parse(atob(base64)) as { exp?: unknown };

    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function SessionExpirationWatcher() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let timer: number | undefined;
    let alreadyLoggedOut = false;

    function checkSession() {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      const token = getToken();
      if (!token || alreadyLoggedOut) return;

      const expiresAt = getExpirationTime(token);

      if (expiresAt === null || expiresAt <= Date.now()) {
        alreadyLoggedOut = true;
        clearToken();
        toast.error("Your session has expired. Please log in again.");
        navigate("/login", { replace: true });
        return;
      }

      timer = window.setTimeout(checkSession, expiresAt - Date.now());
    }

    checkSession();
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);

    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [location.pathname, navigate]);

  return null;
}