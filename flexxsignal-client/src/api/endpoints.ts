import { apiClient } from "./client";
export { apiErrorMessage } from "./client";
import type {
  AdminDashboardSummaryDto, AdminUserDto, AnnouncementDto, AuditLogDto, BacktestListItemDto, BacktestResultDto,
  ConfidenceBandStatDto, DataHealthDto, NotificationDto, PagedResult, PaymentRecordDto, ProviderConfigurationDto,
  SignalDto, SignalListItemDto, SignalStatisticsDto, StrategyDto, StrategyPerformanceDto, SubscriptionPlanDto,
  SupportTicketDto, SupportTicketListItemDto, TradingPairDto, UserSubscriptionDto,
} from "../types/domain";

// ----- Auth -----
export const AuthApi = {
  register: (body: { email: string; password: string; displayName: string; preferredLanguage?: string }) =>
    apiClient.post("/api/auth/register", body).then((r) => r.data),
  login: (body: { email: string; password: string }) => apiClient.post("/api/auth/login", body).then((r) => r.data),
  me: () => apiClient.get("/api/auth/me").then((r) => r.data),
  updateMe: (body: { displayName: string; preferredLanguage: string; timeZoneId: string; themePreference: string }) =>
    apiClient.put("/api/auth/me", body).then((r) => r.data),
  changePassword: (body: { currentPassword: string; newPassword: string }) => apiClient.post("/api/auth/change-password", body),
  forgotPassword: (email: string) => apiClient.post("/api/auth/forgot-password", { email }),
  resetPassword: (body: { email: string; token: string; newPassword: string }) => apiClient.post("/api/auth/reset-password", body),
};

// ----- Signals -----
export const SignalsApi = {
  live: () => apiClient.get<SignalListItemDto[]>("/api/signals/live").then((r) => r.data),
  byId: (id: string) => apiClient.get<SignalDto>(`/api/signals/${id}`).then((r) => r.data),
  history: (params: Record<string, any>) => apiClient.get<PagedResult<SignalListItemDto>>("/api/signals/history", { params }).then((r) => r.data),
  statistics: () => apiClient.get<SignalStatisticsDto>("/api/signals/statistics").then((r) => r.data),
  confidenceCalibration: () => apiClient.get<ConfidenceBandStatDto[]>("/api/signals/confidence-calibration").then((r) => r.data),
  createManual: (body: any) => apiClient.post("/api/signals/manual", body).then((r) => r.data),
  cancel: (id: string, reason: string) => apiClient.post(`/api/signals/${id}/cancel`, { reason }),
  correctResult: (id: string, body: { newOutcome: number; reason: string }) => apiClient.post(`/api/signals/${id}/correct-result`, body),
};

// ----- Market data -----
export const MarketDataApi = {
  pairs: (activeOnly = true) => apiClient.get<TradingPairDto[]>("/api/market-data/pairs", { params: { activeOnly } }).then((r) => r.data),
  upsertPair: (id: string | null, body: any) => apiClient.post("/api/market-data/pairs", body, { params: { id } }).then((r) => r.data),
  sessions: () => apiClient.get("/api/market-data/sessions").then((r) => r.data),
  upsertSession: (id: string | null, body: any) => apiClient.post("/api/market-data/sessions", body, { params: { id } }).then((r) => r.data),
  providers: () => apiClient.get<ProviderConfigurationDto[]>("/api/market-data/providers").then((r) => r.data),
  upsertProvider: (id: string | null, body: any) => apiClient.post("/api/market-data/providers", body, { params: { id } }).then((r) => r.data),
  health: (count = 50) => apiClient.get<DataHealthDto[]>("/api/market-data/health", { params: { count } }).then((r) => r.data),
  candles: (pair: string, timeframe: number, fromUtc: string, toUtc: string) =>
    apiClient.get("/api/market-data/candles", { params: { pair, timeframe, fromUtc, toUtc } }).then((r) => r.data),
  importCsv: (pair: string, timeframe: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post("/api/market-data/candles/import-csv", form, { params: { pair, timeframe } }).then((r) => r.data);
  },
};

// ----- Strategies -----
export const StrategiesApi = {
  all: () => apiClient.get<StrategyDto[]>("/api/strategies").then((r) => r.data),
  byId: (id: string) => apiClient.get<StrategyDto>(`/api/strategies/${id}`).then((r) => r.data),
  performance: () => apiClient.get<StrategyPerformanceDto[]>("/api/strategies/performance").then((r) => r.data),
  createVersion: (body: any) => apiClient.post("/api/strategies/versions", body).then((r) => r.data),
  updateStatus: (id: string, status: number) => apiClient.put(`/api/strategies/${id}/status`, { status }),
  activateVersion: (versionId: string) => apiClient.post(`/api/strategies/versions/${versionId}/activate`),
};

// ----- Backtests -----
export const BacktestsApi = {
  history: () => apiClient.get<BacktestListItemDto[]>("/api/backtests").then((r) => r.data),
  result: (id: string) => apiClient.get<BacktestResultDto>(`/api/backtests/${id}`).then((r) => r.data),
  run: (form: FormData) => apiClient.post("/api/backtests", form).then((r) => r.data),
};

// ----- Subscriptions / Payments -----
export const SubscriptionsApi = {
  plans: (activeOnly = true) => apiClient.get<SubscriptionPlanDto[]>("/api/subscription-plans", { params: { activeOnly } }).then((r) => r.data),
  upsertPlan: (id: string | null, body: any) => apiClient.post("/api/subscription-plans", body, { params: { id } }).then((r) => r.data),
  mine: () => apiClient.get<UserSubscriptionDto | null>("/api/subscriptions/mine").then((r) => r.data),
  submitPayment: (body: any) => apiClient.post("/api/payments", body).then((r) => r.data),
  pendingPayments: () => apiClient.get<PaymentRecordDto[]>("/api/payments/pending").then((r) => r.data),
  reviewPayment: (id: string, body: { approve: boolean; note?: string }) => apiClient.post(`/api/payments/${id}/review`, body),
};

// ----- Notifications -----
export const NotificationsApi = {
  list: (unreadOnly = false) => apiClient.get<NotificationDto[]>("/api/notifications", { params: { unreadOnly } }).then((r) => r.data),
  markRead: (id: string) => apiClient.post(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.post("/api/notifications/read-all"),
  preferences: () => apiClient.get("/api/notifications/preferences").then((r) => r.data),
  updatePreferences: (body: any) => apiClient.put("/api/notifications/preferences", body).then((r) => r.data),
  announcements: () => apiClient.get<AnnouncementDto[]>("/api/announcements").then((r) => r.data),
  upsertAnnouncement: (id: string | null, body: any) => apiClient.post("/api/announcements", body, { params: { id } }).then((r) => r.data),
};

// ----- Support tickets -----
export const SupportApi = {
  mine: () => apiClient.get<SupportTicketListItemDto[]>("/api/support-tickets/mine").then((r) => r.data),
  all: (params: Record<string, any> = {}) => apiClient.get<SupportTicketListItemDto[]>("/api/support-tickets", { params }).then((r) => r.data),
  byId: (id: string) => apiClient.get<SupportTicketDto>(`/api/support-tickets/${id}`).then((r) => r.data),
  create: (body: { subject: string; category: string; message: string; priority: number }) =>
    apiClient.post("/api/support-tickets", body).then((r) => r.data),
  addMessage: (id: string, message: string) => apiClient.post(`/api/support-tickets/${id}/messages`, { message }),
  update: (id: string, body: any) => apiClient.put(`/api/support-tickets/${id}`, body),
};

// ----- Admin -----
export const AdminApi = {
  dashboard: () => apiClient.get<AdminDashboardSummaryDto>("/api/admin/dashboard").then((r) => r.data),
  users: (search?: string) => apiClient.get<AdminUserDto[]>("/api/admin/users", { params: { search } }).then((r) => r.data),
  updateRoles: (id: string, roles: string[]) => apiClient.put(`/api/admin/users/${id}/roles`, { roles }),
  setActive: (id: string, isActive: boolean) => apiClient.put(`/api/admin/users/${id}/active`, { isActive }),
  roles: () => apiClient.get<string[]>("/api/admin/roles").then((r) => r.data),
  auditLogs: (params: Record<string, any>) => apiClient.get<PagedResult<AuditLogDto>>("/api/admin/audit-logs", { params }).then((r) => r.data),
  settings: (category?: string) => apiClient.get("/api/admin/settings", { params: { category } }).then((r) => r.data),
  updateSetting: (key: string, value: string) => apiClient.put("/api/admin/settings", { key, value }),
};
