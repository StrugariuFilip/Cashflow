import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";

import { getToken } from "./lib/auth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import TransactionsPage from "./pages/TransactionsPage";
import SessionExpirationWatcher from "./components/SessionExpirationWatcher";

function Protected({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const token = getToken();

  return (
    <>
      <SessionExpirationWatcher />

      <Routes>
        <Route
          path="/"
          element={
            <Navigate to={token ? "/dashboard" : "/login"} replace />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/transactions"
          element={
            <Protected>
              <TransactionsPage />
            </Protected>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={token ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </>
  );
}