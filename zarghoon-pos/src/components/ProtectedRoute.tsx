import { Navigate, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useGoldRateStore } from "../store/goldRateStore";
import GoldRateModal from "./GoldRateModal";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsDailyPrompt = useGoldRateStore((s) => s.needsDailyPrompt());
  const [dismissedToday, setDismissedToday] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      {needsDailyPrompt && !dismissedToday && (
        <GoldRateModal onDone={() => setDismissedToday(true)} />
      )}
    </>
  );
}
