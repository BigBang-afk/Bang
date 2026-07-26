using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace FXVolumeTrader.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApplicationLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Level = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Message = table.Column<string>(type: "TEXT", nullable: false),
                    Exception = table.Column<string>(type: "TEXT", nullable: true),
                    SourceContext = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Key = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Candles",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Symbol = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Timeframe = table.Column<int>(type: "INTEGER", nullable: false),
                    StartTimeUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndTimeUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Open = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    High = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Low = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Close = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    TickVolume = table.Column<int>(type: "INTEGER", nullable: false),
                    BullishTicks = table.Column<int>(type: "INTEGER", nullable: false),
                    BearishTicks = table.Column<int>(type: "INTEGER", nullable: false),
                    NeutralTicks = table.Column<int>(type: "INTEGER", nullable: false),
                    AverageSpread = table.Column<decimal>(type: "TEXT", nullable: false),
                    MaximumSpread = table.Column<decimal>(type: "TEXT", nullable: false),
                    PriceVelocity = table.Column<decimal>(type: "TEXT", nullable: false),
                    VolumeVelocity = table.Column<decimal>(type: "TEXT", nullable: false),
                    IsFinalized = table.Column<bool>(type: "INTEGER", nullable: false),
                    DataSource = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Candles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StrategyConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Version = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    MinRelativeVolume = table.Column<decimal>(type: "TEXT", precision: 9, scale: 4, nullable: false),
                    MinBodyPercentage = table.Column<decimal>(type: "TEXT", precision: 9, scale: 4, nullable: false),
                    MaxWickPercentage = table.Column<decimal>(type: "TEXT", precision: 9, scale: 4, nullable: false),
                    MinConfidence = table.Column<int>(type: "INTEGER", nullable: false),
                    EmaFastPeriod = table.Column<int>(type: "INTEGER", nullable: false),
                    EmaSlowPeriod = table.Column<int>(type: "INTEGER", nullable: false),
                    EmaTrendPeriod = table.Column<int>(type: "INTEGER", nullable: false),
                    RsiPeriod = table.Column<int>(type: "INTEGER", nullable: false),
                    RsiOverbought = table.Column<int>(type: "INTEGER", nullable: false),
                    RsiOversold = table.Column<int>(type: "INTEGER", nullable: false),
                    AdxPeriod = table.Column<int>(type: "INTEGER", nullable: false),
                    AdxThreshold = table.Column<decimal>(type: "TEXT", precision: 9, scale: 4, nullable: false),
                    SupportResistanceDistancePips = table.Column<decimal>(type: "TEXT", precision: 9, scale: 4, nullable: false),
                    SignalCooldownSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxSpread = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    MaxFeedDelaySeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    ExtendedParametersJson = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StrategyConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TradingSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Mode = table.Column<int>(type: "INTEGER", nullable: false),
                    StartingBalance = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    EndingBalance = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    TotalTrades = table.Column<int>(type: "INTEGER", nullable: false),
                    Wins = table.Column<int>(type: "INTEGER", nullable: false),
                    Losses = table.Column<int>(type: "INTEGER", nullable: false),
                    Draws = table.Column<int>(type: "INTEGER", nullable: false),
                    NetResult = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradingSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Backtests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 150, nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DateRangeStartUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateRangeEndUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StrategyConfigurationId = table.Column<int>(type: "INTEGER", nullable: false),
                    PayoutPercentage = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    SpreadPips = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    SlippagePips = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    SignalDelayMs = table.Column<int>(type: "INTEGER", nullable: false),
                    ExecutionDelayMs = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalTrades = table.Column<int>(type: "INTEGER", nullable: false),
                    Wins = table.Column<int>(type: "INTEGER", nullable: false),
                    Losses = table.Column<int>(type: "INTEGER", nullable: false),
                    Draws = table.Column<int>(type: "INTEGER", nullable: false),
                    WinRate = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    NetResult = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    GrossProfit = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    GrossLoss = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    MaxDrawdown = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    ProfitFactor = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    AverageConfidence = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Backtests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Backtests_StrategyConfigurations_StrategyConfigurationId",
                        column: x => x.StrategyConfigurationId,
                        principalTable: "StrategyConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RiskEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    OccurredAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EventType = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    TradingSessionId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RiskEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RiskEvents_TradingSessions_TradingSessionId",
                        column: x => x.TradingSessionId,
                        principalTable: "TradingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Signals",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Symbol = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Timeframe = table.Column<int>(type: "INTEGER", nullable: false),
                    Expiry = table.Column<int>(type: "INTEGER", nullable: false),
                    SignalType = table.Column<int>(type: "INTEGER", nullable: false),
                    ConfidenceScore = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CandleId = table.Column<long>(type: "INTEGER", nullable: true),
                    StrategyVersion = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    MarketCondition = table.Column<int>(type: "INTEGER", nullable: false),
                    TradingSessionId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Signals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Signals_Candles_CandleId",
                        column: x => x.CandleId,
                        principalTable: "Candles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Signals_TradingSessions_TradingSessionId",
                        column: x => x.TradingSessionId,
                        principalTable: "TradingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TickRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Symbol = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Bid = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Ask = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Last = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    TimestampUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Direction = table.Column<int>(type: "INTEGER", nullable: false),
                    SequenceNumber = table.Column<long>(type: "INTEGER", nullable: false),
                    DataSource = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    TradingSessionId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TickRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TickRecords_TradingSessions_TradingSessionId",
                        column: x => x.TradingSessionId,
                        principalTable: "TradingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "BacktestTrades",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BacktestId = table.Column<int>(type: "INTEGER", nullable: false),
                    DateUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Asset = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Direction = table.Column<int>(type: "INTEGER", nullable: false),
                    EntryPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    ExitPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Payout = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Expiry = table.Column<int>(type: "INTEGER", nullable: false),
                    Timeframe = table.Column<int>(type: "INTEGER", nullable: false),
                    Confidence = table.Column<int>(type: "INTEGER", nullable: false),
                    Result = table.Column<int>(type: "INTEGER", nullable: false),
                    ProfitLoss = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false)
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
                name: "SignalScoreComponents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SignalId = table.Column<long>(type: "INTEGER", nullable: false),
                    ComponentName = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Score = table.Column<int>(type: "INTEGER", nullable: false),
                    MaxScore = table.Column<int>(type: "INTEGER", nullable: false),
                    Explanation = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalScoreComponents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SignalScoreComponents_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TradeRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TradeIdExternal = table.Column<string>(type: "TEXT", nullable: true),
                    DateUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Asset = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Direction = table.Column<int>(type: "INTEGER", nullable: false),
                    EntryPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    ExitPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Payout = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    Expiry = table.Column<int>(type: "INTEGER", nullable: false),
                    Timeframe = table.Column<int>(type: "INTEGER", nullable: false),
                    SignalConfidence = table.Column<int>(type: "INTEGER", nullable: true),
                    SignalReason = table.Column<string>(type: "TEXT", nullable: true),
                    StrategyVersion = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    MarketCondition = table.Column<int>(type: "INTEGER", nullable: false),
                    Result = table.Column<int>(type: "INTEGER", nullable: false),
                    ProfitLoss = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: true),
                    ScreenshotPath = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    DataSource = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    Mode = table.Column<int>(type: "INTEGER", nullable: false),
                    SignalId = table.Column<long>(type: "INTEGER", nullable: true),
                    TradingSessionId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradeRecords_Signals_SignalId",
                        column: x => x.SignalId,
                        principalTable: "Signals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TradeRecords_TradingSessions_TradingSessionId",
                        column: x => x.TradingSessionId,
                        principalTable: "TradingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "AppSettings",
                columns: new[] { "Id", "Category", "Description", "Key", "UpdatedAtUtc", "Value" },
                values: new object[,]
                {
                    { 1, "General", "Demo/paper mode is enabled by default for safety.", "App.DemoModeEnabled", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "true" },
                    { 2, "General", "Startup trading mode.", "App.DefaultTradingMode", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "LiveSignalOnly" },
                    { 3, "Appearance", "Application theme.", "App.Theme", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Dark" },
                    { 4, "Risk", "Maximum daily loss before trading is halted.", "Risk.MaxDailyLoss", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "50" },
                    { 5, "Risk", "Daily profit target (informational stop point).", "Risk.DailyProfitTarget", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "100" },
                    { 6, "Risk", "Maximum number of trades allowed per day.", "Risk.MaxTradesPerDay", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "20" },
                    { 7, "Risk", "Maximum number of trades allowed per session.", "Risk.MaxTradesPerSession", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "10" },
                    { 8, "Risk", "Consecutive losses before a cooldown is enforced.", "Risk.ConsecutiveLossLimit", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "3" },
                    { 9, "Risk", "Cooldown period after a loss.", "Risk.CooldownAfterLossSeconds", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "300" },
                    { 10, "Risk", "Cooldown period after any signal is issued.", "Risk.CooldownAfterSignalSeconds", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "15" },
                    { 11, "Risk", "Fixed trade amount used when percentage-based risk is disabled.", "Risk.FixedTradeAmount", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "1" },
                    { 12, "Risk", "Hard ceiling on any single trade amount.", "Risk.MaxTradeAmount", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "25" },
                    { 13, "Risk", "Optional loss-recovery sizing system. Disabled by default - increases risk when enabled.", "Risk.RecoverySystemEnabled", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "false" },
                    { 14, "Notifications", "Show a desktop notification when a new signal is generated.", "Notifications.DesktopEnabled", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "true" },
                    { 15, "Notifications", "Play a sound alert when a new signal is generated.", "Notifications.SoundEnabled", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "true" },
                    { 16, "Compliance", "Whether the user has acknowledged the risk warning / no-guarantee disclaimer.", "Compliance.DisclaimerAcknowledged", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "false" }
                });

            migrationBuilder.InsertData(
                table: "StrategyConfigurations",
                columns: new[] { "Id", "AdxPeriod", "AdxThreshold", "CreatedAtUtc", "EmaFastPeriod", "EmaSlowPeriod", "EmaTrendPeriod", "ExtendedParametersJson", "IsActive", "MaxFeedDelaySeconds", "MaxSpread", "MaxWickPercentage", "MinBodyPercentage", "MinConfidence", "MinRelativeVolume", "Name", "RsiOverbought", "RsiOversold", "RsiPeriod", "SignalCooldownSeconds", "SupportResistanceDistancePips", "UpdatedAtUtc", "Version" },
                values: new object[] { 1, 14, 20m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 20, 50, 200, null, true, 5, 0.0005m, 40m, 50m, 65, 1.2m, "Default Volume Pressure Strategy", 70, 30, 14, 30, 5m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "1.0.0" });

            migrationBuilder.CreateIndex(
                name: "IX_ApplicationLogs_TimestampUtc",
                table: "ApplicationLogs",
                column: "TimestampUtc");

            migrationBuilder.CreateIndex(
                name: "IX_AppSettings_Key",
                table: "AppSettings",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Backtests_StrategyConfigurationId",
                table: "Backtests",
                column: "StrategyConfigurationId");

            migrationBuilder.CreateIndex(
                name: "IX_BacktestTrades_BacktestId",
                table: "BacktestTrades",
                column: "BacktestId");

            migrationBuilder.CreateIndex(
                name: "IX_Candles_Symbol_Timeframe_StartTimeUtc",
                table: "Candles",
                columns: new[] { "Symbol", "Timeframe", "StartTimeUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RiskEvents_OccurredAtUtc",
                table: "RiskEvents",
                column: "OccurredAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_RiskEvents_TradingSessionId",
                table: "RiskEvents",
                column: "TradingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Signals_CandleId",
                table: "Signals",
                column: "CandleId");

            migrationBuilder.CreateIndex(
                name: "IX_Signals_Symbol_CreatedAtUtc",
                table: "Signals",
                columns: new[] { "Symbol", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Signals_TradingSessionId",
                table: "Signals",
                column: "TradingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_SignalScoreComponents_SignalId",
                table: "SignalScoreComponents",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "IX_TickRecords_Symbol_TimestampUtc",
                table: "TickRecords",
                columns: new[] { "Symbol", "TimestampUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_TickRecords_TradingSessionId",
                table: "TickRecords",
                column: "TradingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeRecords_DateUtc",
                table: "TradeRecords",
                column: "DateUtc");

            migrationBuilder.CreateIndex(
                name: "IX_TradeRecords_Result",
                table: "TradeRecords",
                column: "Result");

            migrationBuilder.CreateIndex(
                name: "IX_TradeRecords_SignalId",
                table: "TradeRecords",
                column: "SignalId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeRecords_TradingSessionId",
                table: "TradeRecords",
                column: "TradingSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApplicationLogs");

            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "BacktestTrades");

            migrationBuilder.DropTable(
                name: "RiskEvents");

            migrationBuilder.DropTable(
                name: "SignalScoreComponents");

            migrationBuilder.DropTable(
                name: "TickRecords");

            migrationBuilder.DropTable(
                name: "TradeRecords");

            migrationBuilder.DropTable(
                name: "Backtests");

            migrationBuilder.DropTable(
                name: "Signals");

            migrationBuilder.DropTable(
                name: "StrategyConfigurations");

            migrationBuilder.DropTable(
                name: "Candles");

            migrationBuilder.DropTable(
                name: "TradingSessions");
        }
    }
}
