using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FlexXSignal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitleEn = table.Column<string>(type: "text", nullable: false),
                    BodyEn = table.Column<string>(type: "text", nullable: false),
                    TitleUr = table.Column<string>(type: "text", nullable: true),
                    BodyUr = table.Column<string>(type: "text", nullable: true),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorDisplayName = table.Column<string>(type: "text", nullable: false),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    EntityName = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<string>(type: "text", nullable: true),
                    OldValueJson = table.Column<string>(type: "text", nullable: true),
                    NewValueJson = table.Column<string>(type: "text", nullable: true),
                    Reason = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "text", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MarketDataProviderConfigurations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProviderType = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ApiEndpoint = table.Column<string>(type: "text", nullable: true),
                    ApiKeyEncrypted = table.Column<string>(type: "text", nullable: true),
                    ConnectionTimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    ReconnectIntervalSeconds = table.Column<int>(type: "integer", nullable: false),
                    MaxReconnectAttempts = table.Column<int>(type: "integer", nullable: false),
                    TimeZoneId = table.Column<string>(type: "text", nullable: false),
                    CandleAlignmentMode = table.Column<string>(type: "text", nullable: false),
                    PairMappingJson = table.Column<string>(type: "text", nullable: false),
                    CsvImportDirectory = table.Column<string>(type: "text", nullable: true),
                    LastKnownStatus = table.Column<int>(type: "integer", nullable: false),
                    LastConnectedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastDataReceivedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarketDataProviderConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    TitleTemplateEn = table.Column<string>(type: "text", nullable: false),
                    BodyTemplateEn = table.Column<string>(type: "text", nullable: false),
                    TitleTemplateUr = table.Column<string>(type: "text", nullable: false),
                    BodyTemplateUr = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Strategies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Key = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MaxSignalsPerHour = table.Column<int>(type: "integer", nullable: false),
                    DailyLossLimitPercent = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Strategies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    MonthlyPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    AnnualPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    MaxSignalsPerDay = table.Column<int>(type: "integer", nullable: false),
                    AllowAllPairs = table.Column<bool>(type: "boolean", nullable: false),
                    AllowedPairsCsv = table.Column<string>(type: "text", nullable: false),
                    SignalDelaySeconds = table.Column<int>(type: "integer", nullable: false),
                    SignalHistoryDays = table.Column<int>(type: "integer", nullable: false),
                    AnalyticsAccess = table.Column<bool>(type: "boolean", nullable: false),
                    BacktestingAccess = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationAccess = table.Column<bool>(type: "boolean", nullable: false),
                    OtcPairsAccess = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    DataType = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsSecret = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TradingPairs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    MarketType = table.Column<int>(type: "integer", nullable: false),
                    BaseCurrency = table.Column<string>(type: "text", nullable: false),
                    QuoteCurrency = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CurrentPayoutPercent = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    ProviderSymbolMapping = table.Column<string>(type: "text", nullable: false),
                    PricePrecision = table.Column<int>(type: "integer", nullable: false),
                    RequiresPremium = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradingPairs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: false),
                    PreferredLanguage = table.Column<string>(type: "text", nullable: false),
                    TimeZoneId = table.Column<string>(type: "text", nullable: false),
                    ThemePreference = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoleClaims_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StrategyVersions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StrategyId = table.Column<Guid>(type: "uuid", nullable: false),
                    VersionNumber = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ChangeNotes = table.Column<string>(type: "text", nullable: false),
                    WeightTrendAlignment = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightMarketStructure = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightCandlePressure = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightMomentum = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightSupportResistance = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightBreakoutRejection = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightMultiTimeframeAgreement = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightVolatilityQuality = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    WeightHistoricalPerformance = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    MinimumPublishConfidence = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StrategyVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StrategyVersions_Strategies_StrategyId",
                        column: x => x.StrategyId,
                        principalTable: "Strategies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Candles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TradingPairId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timeframe = table.Column<int>(type: "integer", nullable: false),
                    OpenTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CloseTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Open = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    High = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Low = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Close = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Volume = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false),
                    DataSource = table.Column<string>(type: "text", nullable: false),
                    DataQuality = table.Column<int>(type: "integer", nullable: false),
                    ProviderTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IngestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Candles_TradingPairs_TradingPairId",
                        column: x => x.TradingPairId,
                        principalTable: "TradingPairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DataHealthLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MarketDataProviderConfigurationId = table.Column<Guid>(type: "uuid", nullable: false),
                    TradingPairId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConnectionStatus = table.Column<int>(type: "integer", nullable: false),
                    DataQuality = table.Column<int>(type: "integer", nullable: false),
                    LatencyMs = table.Column<int>(type: "integer", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: true),
                    RecordedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataHealthLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DataHealthLogs_MarketDataProviderConfigurations_MarketDataP~",
                        column: x => x.MarketDataProviderConfigurationId,
                        principalTable: "MarketDataProviderConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DataHealthLogs_TradingPairs_TradingPairId",
                        column: x => x.TradingPairId,
                        principalTable: "TradingPairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TradingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    TradingPairId = table.Column<Guid>(type: "uuid", nullable: true),
                    StartUtc = table.Column<TimeSpan>(type: "interval", nullable: false),
                    EndUtc = table.Column<TimeSpan>(type: "interval", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DaysOfWeekMask = table.Column<string>(type: "text", nullable: false),
                    MaxSignalsPerHour = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradingSessions_TradingPairs_TradingPairId",
                        column: x => x.TradingPairId,
                        principalTable: "TradingPairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "LoginHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: false),
                    UserAgent = table.Column<string>(type: "text", nullable: false),
                    FailureReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoginHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoginHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SoundEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    BrowserNotificationsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    EmailNotificationsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    TelegramNotificationsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    TelegramChatId = table.Column<string>(type: "text", nullable: true),
                    MinimumConfidencePercent = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    SelectedPairIdsCsv = table.Column<string>(type: "text", nullable: false),
                    NotifyUpSignals = table.Column<bool>(type: "boolean", nullable: false),
                    NotifyDownSignals = table.Column<bool>(type: "boolean", nullable: false),
                    UpcomingSignalReminder = table.Column<bool>(type: "boolean", nullable: false),
                    UpcomingReminderSecondsBefore = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    RelatedSignalId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    ReadAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Channel = table.Column<int>(type: "integer", nullable: false),
                    Delivered = table.Column<bool>(type: "boolean", nullable: false),
                    DeliveredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "text", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "text", nullable: true),
                    CreatedByIp = table.Column<string>(type: "text", nullable: false),
                    RevokedByIp = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupportTickets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClosedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportTickets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserClaims_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_UserLogins_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AutoRenew = table.Column<bool>(type: "boolean", nullable: false),
                    BillingCycle = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSubscriptions_SubscriptionPlans_SubscriptionPlanId",
                        column: x => x.SubscriptionPlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserSubscriptions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_UserTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Backtests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    TradingPairId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timeframe = table.Column<int>(type: "integer", nullable: false),
                    StrategyVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Duration = table.Column<int>(type: "integer", nullable: false),
                    InSampleStartUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InSampleEndUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OutOfSampleStartUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OutOfSampleEndUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WalkForwardEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    WalkForwardFolds = table.Column<int>(type: "integer", nullable: false),
                    ConfidenceThresholdOverride = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    StrategySettingsSnapshotJson = table.Column<string>(type: "text", nullable: false),
                    SourceCsvFileName = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Backtests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Backtests_StrategyVersions_StrategyVersionId",
                        column: x => x.StrategyVersionId,
                        principalTable: "StrategyVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Backtests_TradingPairs_TradingPairId",
                        column: x => x.TradingPairId,
                        principalTable: "TradingPairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Signals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TradeNumber = table.Column<long>(type: "bigint", nullable: false),
                    TradingPairId = table.Column<Guid>(type: "uuid", nullable: false),
                    StrategyVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Timeframe = table.Column<int>(type: "integer", nullable: false),
                    Duration = table.Column<int>(type: "integer", nullable: false),
                    Direction = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MarketCondition = table.Column<int>(type: "integer", nullable: false),
                    SignalCreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntryTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpirationTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfidencePercent = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    PayoutPercentAtCreation = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    AnalysisExplanationEn = table.Column<string>(type: "text", nullable: false),
                    AnalysisExplanationUr = table.Column<string>(type: "text", nullable: false),
                    EntryPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: true),
                    ExpirationPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: true),
                    DataSourceName = table.Column<string>(type: "text", nullable: false),
                    DataQuality = table.Column<int>(type: "integer", nullable: false),
                    IsManual = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CancelReason = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Signals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Signals_StrategyVersions_StrategyVersionId",
                        column: x => x.StrategyVersionId,
                        principalTable: "StrategyVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Signals_TradingPairs_TradingPairId",
                        column: x => x.TradingPairId,
                        principalTable: "TradingPairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StrategyParameters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StrategyVersionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    DataType = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StrategyParameters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StrategyParameters_StrategyVersions_StrategyVersionId",
                        column: x => x.StrategyVersionId,
                        principalTable: "StrategyVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupportTicketMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportTicketId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsFromStaff = table.Column<bool>(type: "boolean", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    AttachmentUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportTicketMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportTicketMessages_SupportTickets_SupportTicketId",
                        column: x => x.SupportTicketId,
                        principalTable: "SupportTickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserSubscriptionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    PaymentMethod = table.Column<string>(type: "text", nullable: false),
                    ReferenceCode = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ProofOfPaymentUrl = table.Column<string>(type: "text", nullable: true),
                    AdminNote = table.Column<string>(type: "text", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentRecords_UserSubscriptions_UserSubscriptionId",
                        column: x => x.UserSubscriptionId,
                        principalTable: "UserSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PaymentRecords_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BacktestMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BacktestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Key = table.Column<string>(type: "text", nullable: false),
                    MetricsJson = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BacktestMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BacktestMetrics_Backtests_BacktestId",
                        column: x => x.BacktestId,
                        principalTable: "Backtests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BacktestTrades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BacktestId = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpirationTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Direction = table.Column<int>(type: "integer", nullable: false),
                    EntryPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    ExpirationPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    ConfidencePercent = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    MarketCondition = table.Column<int>(type: "integer", nullable: false),
                    Outcome = table.Column<int>(type: "integer", nullable: false),
                    IsOutOfSample = table.Column<bool>(type: "boolean", nullable: false),
                    WalkForwardFoldIndex = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BacktestTrades", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BacktestTrades_Backtests_BacktestId",
                        column: x => x.BacktestId,
                        principalTable: "Backtests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SignalReasons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsSupporting = table.Column<bool>(type: "boolean", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    IndicatorsUsedCsv = table.Column<string>(type: "text", nullable: false),
                    SupportingCandleIndexesCsv = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalReasons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalReasons_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SignalResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Outcome = table.Column<int>(type: "integer", nullable: false),
                    EntryCandleId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpirationCandleId = table.Column<Guid>(type: "uuid", nullable: true),
                    EntryPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    ExpirationPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    OriginalSignalTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntryTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpirationTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProviderTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ServerTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VerificationTimestampUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VerificationMethod = table.Column<int>(type: "integer", nullable: false),
                    DataSourceIdentifier = table.Column<string>(type: "text", nullable: false),
                    IsLocked = table.Column<bool>(type: "boolean", nullable: false),
                    CorrectedFromOutcome = table.Column<int>(type: "integer", nullable: true),
                    CorrectionReason = table.Column<string>(type: "text", nullable: true),
                    CorrectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CorrectedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalResults_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SignalScores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrendScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    MarketStructureScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    MomentumScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    CandlePressureScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    SupportResistanceScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    BreakoutScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    VolatilityScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    DataQualityScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    HistoricalStrategyScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    MultiTimeframeScore = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    FinalCalibratedConfidence = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalScores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalScores_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SignalSnapshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SignalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    CandlesJson = table.Column<string>(type: "text", nullable: false),
                    CapturedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalSnapshots_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityName",
                table: "AuditLogs",
                column: "EntityName");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_OccurredAtUtc",
                table: "AuditLogs",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_BacktestMetrics_BacktestId",
                table: "BacktestMetrics",
                column: "BacktestId");

            migrationBuilder.CreateIndex(
                name: "IX_Backtests_CreatedAtUtc",
                table: "Backtests",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Backtests_StrategyVersionId",
                table: "Backtests",
                column: "StrategyVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_Backtests_TradingPairId",
                table: "Backtests",
                column: "TradingPairId");

            migrationBuilder.CreateIndex(
                name: "IX_BacktestTrades_BacktestId",
                table: "BacktestTrades",
                column: "BacktestId");

            migrationBuilder.CreateIndex(
                name: "IX_Candles_TradingPairId_Timeframe_OpenTimeUtc",
                table: "Candles",
                columns: new[] { "TradingPairId", "Timeframe", "OpenTimeUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DataHealthLogs_MarketDataProviderConfigurationId",
                table: "DataHealthLogs",
                column: "MarketDataProviderConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_DataHealthLogs_RecordedAtUtc",
                table: "DataHealthLogs",
                column: "RecordedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_DataHealthLogs_TradingPairId",
                table: "DataHealthLogs",
                column: "TradingPairId");

            migrationBuilder.CreateIndex(
                name: "IX_LoginHistories_AttemptedAtUtc",
                table: "LoginHistories",
                column: "AttemptedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_LoginHistories_UserId",
                table: "LoginHistories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_UserId",
                table: "NotificationPreferences",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationTemplates_Key",
                table: "NotificationTemplates",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecords_Status",
                table: "PaymentRecords",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecords_UserId",
                table: "PaymentRecords",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentRecords_UserSubscriptionId",
                table: "PaymentRecords",
                column: "UserSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleClaims_RoleId",
                table: "RoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "Roles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SignalReasons_SignalId",
                table: "SignalReasons",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "IX_SignalResults_Outcome",
                table: "SignalResults",
                column: "Outcome");

            migrationBuilder.CreateIndex(
                name: "IX_SignalResults_SignalId",
                table: "SignalResults",
                column: "SignalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Signals_EntryTimeUtc",
                table: "Signals",
                column: "EntryTimeUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Signals_Status",
                table: "Signals",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Signals_StrategyVersionId",
                table: "Signals",
                column: "StrategyVersionId");

            migrationBuilder.CreateIndex(
                name: "IX_Signals_TradeNumber",
                table: "Signals",
                column: "TradeNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Signals_TradingPairId",
                table: "Signals",
                column: "TradingPairId");

            migrationBuilder.CreateIndex(
                name: "IX_SignalScores_SignalId",
                table: "SignalScores",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "IX_SignalSnapshots_SignalId",
                table: "SignalSnapshots",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "IX_Strategies_Key",
                table: "Strategies",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StrategyParameters_StrategyVersionId_Key",
                table: "StrategyParameters",
                columns: new[] { "StrategyVersionId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StrategyVersions_StrategyId_VersionNumber",
                table: "StrategyVersions",
                columns: new[] { "StrategyId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportTicketMessages_SupportTicketId",
                table: "SupportTicketMessages",
                column: "SupportTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_Status",
                table: "SupportTickets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_UserId",
                table: "SupportTickets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_Key",
                table: "SystemSettings",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TradingPairs_Symbol",
                table: "TradingPairs",
                column: "Symbol",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TradingSessions_TradingPairId",
                table: "TradingSessions",
                column: "TradingPairId");

            migrationBuilder.CreateIndex(
                name: "IX_UserClaims_UserId",
                table: "UserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserLogins_UserId",
                table: "UserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "Users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "Users",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_Status",
                table: "UserSubscriptions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_SubscriptionPlanId",
                table: "UserSubscriptions",
                column: "SubscriptionPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserSubscriptions_UserId",
                table: "UserSubscriptions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "BacktestMetrics");

            migrationBuilder.DropTable(
                name: "BacktestTrades");

            migrationBuilder.DropTable(
                name: "Candles");

            migrationBuilder.DropTable(
                name: "DataHealthLogs");

            migrationBuilder.DropTable(
                name: "LoginHistories");

            migrationBuilder.DropTable(
                name: "NotificationPreferences");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "NotificationTemplates");

            migrationBuilder.DropTable(
                name: "PaymentRecords");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "RoleClaims");

            migrationBuilder.DropTable(
                name: "SignalReasons");

            migrationBuilder.DropTable(
                name: "SignalResults");

            migrationBuilder.DropTable(
                name: "SignalScores");

            migrationBuilder.DropTable(
                name: "SignalSnapshots");

            migrationBuilder.DropTable(
                name: "StrategyParameters");

            migrationBuilder.DropTable(
                name: "SupportTicketMessages");

            migrationBuilder.DropTable(
                name: "SystemSettings");

            migrationBuilder.DropTable(
                name: "TradingSessions");

            migrationBuilder.DropTable(
                name: "UserClaims");

            migrationBuilder.DropTable(
                name: "UserLogins");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "UserTokens");

            migrationBuilder.DropTable(
                name: "Backtests");

            migrationBuilder.DropTable(
                name: "MarketDataProviderConfigurations");

            migrationBuilder.DropTable(
                name: "UserSubscriptions");

            migrationBuilder.DropTable(
                name: "Signals");

            migrationBuilder.DropTable(
                name: "SupportTickets");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "StrategyVersions");

            migrationBuilder.DropTable(
                name: "TradingPairs");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Strategies");
        }
    }
}
