import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastContainer } from "./components/ui/Toast";
import { PublicLayout, AppLayout } from "./components/layout/Layouts";
import { RequireAuth, RequireStaff, RequireSuperAdmin } from "./components/layout/RouteGuards";
import { useUiStore } from "./store/uiStore";

import LandingPage from "./pages/public/LandingPage";
import FeaturesPage from "./pages/public/FeaturesPage";
import PerformancePage from "./pages/public/PerformancePage";
import PricingPage from "./pages/public/PricingPage";
import { AboutPage, RiskDisclosurePage, TermsPrivacyPage } from "./pages/public/StaticPages";
import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/public/PasswordResetPages";

import DashboardPage from "./pages/app/DashboardPage";
import LiveSignalsPage from "./pages/app/LiveSignalsPage";
import UpcomingSignalsPage from "./pages/app/UpcomingSignalsPage";
import SignalDetailPage from "./pages/app/SignalDetailPage";
import SignalHistoryPage from "./pages/app/SignalHistoryPage";
import PerformanceAnalyticsPage from "./pages/app/PerformanceAnalyticsPage";
import StrategyPerformancePage from "./pages/app/StrategyPerformancePage";
import PairPerformancePage from "./pages/app/PairPerformancePage";
import NotificationsPage from "./pages/app/NotificationsPage";
import SubscriptionPage from "./pages/app/SubscriptionPage";
import ProfilePage from "./pages/app/ProfilePage";
import SecuritySettingsPage from "./pages/app/SecuritySettingsPage";
import SupportTicketsPage from "./pages/app/SupportTicketsPage";
import SupportTicketDetailPage from "./pages/app/SupportTicketDetailPage";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import SubscriptionManagementPage from "./pages/admin/SubscriptionManagementPage";
import PaymentManagementPage from "./pages/admin/PaymentManagementPage";
import MarketPairManagementPage from "./pages/admin/MarketPairManagementPage";
import TradingSessionManagementPage from "./pages/admin/TradingSessionManagementPage";
import StrategyManagementPage from "./pages/admin/StrategyManagementPage";
import SignalMonitoringPage from "./pages/admin/SignalMonitoringPage";
import BacktestingPage from "./pages/admin/BacktestingPage";
import DataProviderSettingsPage from "./pages/admin/DataProviderSettingsPage";
import DataHealthPage from "./pages/admin/DataHealthPage";
import PerformanceReportsPage from "./pages/admin/PerformanceReportsPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import AdminSupportTicketsPage from "./pages/admin/AdminSupportTicketsPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import SiteSettingsPage from "./pages/admin/SiteSettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false } },
});

function ThemeInitializer() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeInitializer />
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="risk-disclosure" element={<RiskDisclosurePage />} />
              <Route path="terms" element={<TermsPrivacyPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="/app" element={<AppLayout mode="app" />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="signals/live" element={<LiveSignalsPage />} />
                <Route path="signals/upcoming" element={<UpcomingSignalsPage />} />
                <Route path="signals/history" element={<SignalHistoryPage />} />
                <Route path="signals/:id" element={<SignalDetailPage />} />
                <Route path="analytics/performance" element={<PerformanceAnalyticsPage />} />
                <Route path="analytics/strategy" element={<StrategyPerformancePage />} />
                <Route path="analytics/pairs" element={<PairPerformancePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="security" element={<SecuritySettingsPage />} />
                <Route path="support" element={<SupportTicketsPage />} />
                <Route path="support/:id" element={<SupportTicketDetailPage />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>

              <Route element={<RequireStaff />}>
                <Route path="/admin" element={<AppLayout mode="admin" />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="subscriptions" element={<SubscriptionManagementPage />} />
                  <Route path="payments" element={<PaymentManagementPage />} />
                  <Route path="pairs" element={<MarketPairManagementPage />} />
                  <Route path="sessions" element={<TradingSessionManagementPage />} />
                  <Route path="strategies" element={<StrategyManagementPage />} />
                  <Route path="signals" element={<SignalMonitoringPage />} />
                  <Route path="backtesting" element={<BacktestingPage />} />
                  <Route path="data-provider" element={<DataProviderSettingsPage />} />
                  <Route path="data-health" element={<DataHealthPage />} />
                  <Route path="reports" element={<PerformanceReportsPage />} />
                  <Route path="support" element={<AdminSupportTicketsPage />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route element={<RequireSuperAdmin />}>
                    <Route path="audit-logs" element={<AuditLogsPage />} />
                    <Route path="settings" element={<SiteSettingsPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
