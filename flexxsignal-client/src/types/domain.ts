export type SignalDirection = "Up" | "Down";
export type SignalStatus =
  | "Draft" | "Scheduled" | "Waiting" | "Active" | "Win" | "Loss" | "Tie" | "Canceled" | "Missed" | "DataError";
export type MarketCondition = "Trending" | "Ranging" | "Volatile" | "Quiet" | "Breakout" | "Reversal" | "Unclear";
export type PairMarketType = "Regular" | "Otc";
export type DataQualityStatus = "Good" | "Delayed" | "Incomplete" | "Invalid" | "Stale";

const DIRECTIONS: SignalDirection[] = ["Up", "Down"];
const STATUSES: SignalStatus[] = ["Draft", "Scheduled", "Waiting", "Active", "Win", "Loss", "Tie", "Canceled", "Missed", "DataError"];
const CONDITIONS: MarketCondition[] = ["Trending", "Ranging", "Volatile", "Quiet", "Breakout", "Reversal", "Unclear"];
const MARKET_TYPES: PairMarketType[] = ["Regular", "Otc"];

export function directionFromNumber(n: number): SignalDirection { return DIRECTIONS[n] ?? "Up"; }
export function statusFromNumber(n: number): SignalStatus { return STATUSES[n] ?? "Draft"; }
export function conditionFromNumber(n: number): MarketCondition { return CONDITIONS[n] ?? "Unclear"; }
export function marketTypeFromNumber(n: number): PairMarketType { return MARKET_TYPES[n] ?? "Regular"; }

export interface SignalScoreDto {
  trendScore: number; marketStructureScore: number; momentumScore: number; candlePressureScore: number;
  supportResistanceScore: number; breakoutScore: number; volatilityScore: number; dataQualityScore: number;
  historicalStrategyScore: number; multiTimeframeScore: number; finalCalibratedConfidence: number;
}

export interface SignalReasonDto {
  isSupporting: boolean; code: string; description: string; indicatorsUsedCsv: string;
}

export interface SignalResultDto {
  outcome: number; entryPrice: number; expirationPrice: number;
  entryTimestampUtc: string; expirationTimestampUtc: string; verificationTimestampUtc: string;
  verificationMethod: number; dataSourceIdentifier: string; isLocked: boolean;
}

export interface CandleSnapshotPointDto {
  timeUtc: string; open: number; high: number; low: number; close: number; volume: number;
}

export interface SignalDto {
  id: string; tradeNumber: number; pairSymbol: string; pairDisplayName: string; marketType: number;
  currentPayoutPercent: number; direction: number; status: number; signalCreatedAtUtc: string;
  entryTimeUtc: string; expirationTimeUtc: string; duration: number; timeframe: number;
  confidencePercent: number; strategyName: string; strategyVersion: number; marketCondition: number;
  analysisExplanationEn: string; analysisExplanationUr: string; entryPrice?: number; expirationPrice?: number;
  dataSourceName: string; dataQuality: number; isDemoData: boolean;
  scores?: SignalScoreDto; reasons: SignalReasonDto[]; result?: SignalResultDto; candleSnapshot: CandleSnapshotPointDto[];
}

export interface SignalListItemDto {
  id: string; tradeNumber: number; pairSymbol: string; marketType: number; direction: number;
  status: number; entryTimeUtc: string; expirationTimeUtc: string; confidencePercent: number;
  strategyName: string; marketCondition: number; isDemoData: boolean;
}

export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }

export interface SignalStatisticsDto {
  todaySignals: number; todayWins: number; todayLosses: number; todayTies: number; todayWinRate: number;
  last20WinRate: number; last100WinRate: number; last500WinRate: number; sevenDayWinRate: number; thirtyDayWinRate: number;
  bestPair?: string; worstPair?: string; bestStrategy?: string; worstStrategy?: string;
  maxLosingStreak: number; currentStreak: number; averageConfidence: number; dataProviderUptimePercent: number;
}

export interface ConfidenceBandStatDto { band: string; totalSignals: number; wins: number; recordedWinRate: number; }

export interface TradingPairDto {
  id: string; symbol: string; displayName: string; marketType: number; isActive: boolean;
  currentPayoutPercent: number; requiresPremium: boolean; pricePrecision: number;
}

export interface StrategyVersionDto {
  id: string; versionNumber: number; isActive: boolean; changeNotes: string;
  weightTrendAlignment: number; weightMarketStructure: number; weightCandlePressure: number; weightMomentum: number;
  weightSupportResistance: number; weightBreakoutRejection: number; weightMultiTimeframeAgreement: number;
  weightVolatilityQuality: number; weightHistoricalPerformance: number; minimumPublishConfidence: number;
  parameters: { key: string; value: string; dataType: string; description?: string }[];
}

export interface StrategyDto {
  id: string; name: string; key: string; description: string; status: number;
  maxSignalsPerHour: number; dailyLossLimitPercent: number; versions: StrategyVersionDto[];
}

export interface StrategyPerformanceDto {
  strategyName: string; totalSignals: number; wins: number; losses: number; ties: number; winRate: number; averageConfidence: number;
}

export interface SubscriptionPlanDto {
  id: string; name: string; description: string; monthlyPrice: number; annualPrice: number; currency: string;
  isActive: boolean; maxSignalsPerDay: number; allowAllPairs: boolean; signalDelaySeconds: number;
  signalHistoryDays: number; analyticsAccess: boolean; backtestingAccess: boolean; notificationAccess: boolean; otcPairsAccess: boolean;
}

export interface UserSubscriptionDto {
  id: string; planName: string; status: number; startsAtUtc: string; endsAtUtc: string; autoRenew: boolean; billingCycle: string;
}

export interface NotificationDto {
  id: string; type: number; title: string; message: string; relatedSignalId?: string; isRead: boolean; createdAtUtc: string;
}

export interface AnnouncementDto {
  id: string; titleEn: string; bodyEn: string; titleUr?: string; bodyUr?: string; severity: string;
  isPublished: boolean; publishAtUtc?: string; expiresAtUtc?: string;
}

export interface SupportTicketListItemDto {
  id: string; subject: string; category: string; status: number; priority: number; createdAtUtc: string; messageCount: number;
}

export interface SupportTicketDto {
  id: string; subject: string; category: string; status: number; priority: number;
  assignedToUserId?: string; createdAtUtc: string; closedAtUtc?: string;
  messages: { id: string; authorUserId: string; isFromStaff: boolean; message: string; createdAtUtc: string }[];
}

export interface AdminUserDto {
  id: string; email: string; displayName: string; isActive: boolean; emailConfirmed: boolean;
  roles: string[]; createdAtUtc: string; lastLoginAtUtc?: string; currentPlan?: string;
}

export interface AdminDashboardSummaryDto {
  totalUsers: number; activeSubscriptions: number; signalsToday: number; todayWinRate: number;
  pendingPayments: number; openSupportTickets: number; activeStrategies: number; dataProviderStatus: number;
}

export interface AuditLogDto {
  id: string; actorUserId?: string; actorDisplayName: string; action: number; entityName: string;
  entityId?: string; oldValueJson?: string; newValueJson?: string; reason?: string; ipAddress: string; occurredAtUtc: string;
}

export interface PaymentRecordDto {
  id: string; userEmail: string; amount: number; currency: string; paymentMethod: string; referenceCode: string;
  status: number; proofOfPaymentUrl?: string; adminNote?: string; createdAtUtc: string; reviewedAtUtc?: string;
}

export interface ProviderConfigurationDto {
  id: string; name: string; providerType: number; isActive: boolean; apiEndpoint?: string; hasApiKeyConfigured: boolean;
  connectionTimeoutSeconds: number; reconnectIntervalSeconds: number; maxReconnectAttempts: number;
  timeZoneId: string; candleAlignmentMode: string; pairMappingJson: string; csvImportDirectory?: string;
  lastKnownStatus: number; lastConnectedAtUtc?: string; lastDataReceivedAtUtc?: string;
}

export interface DataHealthDto {
  providerName: string; connectionStatus: number; dataQuality: number; latencyMs: number; message?: string; recordedAtUtc: string;
}

export interface BacktestListItemDto {
  id: string; name: string; status: number; createdAtUtc: string; completedAtUtc?: string; winRate?: number;
}

export interface BacktestResultDto {
  id: string; name: string; status: number; errorMessage?: string;
  summary?: {
    totalSignals: number; wins: number; losses: number; ties: number; canceled: number;
    winRate: number; lossRate: number; averageConfidence: number; maxWinningStreak: number;
    maxLosingStreak: number; maxDrawdownPercent: number;
  };
  metrics: { category: string; key: string; metricsJson: string }[];
  trades: {
    entryTimeUtc: string; expirationTimeUtc: string; direction: number; entryPrice: number; expirationPrice: number;
    confidencePercent: number; marketCondition: number; outcome: number; isOutOfSample: boolean;
  }[];
}
