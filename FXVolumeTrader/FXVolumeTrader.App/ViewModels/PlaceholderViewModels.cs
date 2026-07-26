namespace FXVolumeTrader.App.ViewModels;

/// <summary>
/// Base for pages not yet implemented past the navigation shell. Each
/// concrete subclass below is registered in DI and mapped to
/// PlaceholderView via an implicit DataTemplate keyed on this base type
/// (see Resources/ViewTemplates.xaml), so adding a real page later is a
/// matter of building its own View/ViewModel and swapping the DI
/// registration - no navigation code changes.
/// </summary>
public abstract class PlaceholderViewModelBase : ViewModelBase
{
    public abstract string Title { get; }

    public abstract string PhaseNote { get; }

    /// <summary>Optional extra note shown below PhaseNote. Empty for most pages.</summary>
    public virtual string ExtraNote => string.Empty;
}

public sealed class LiveChartViewModel : PlaceholderViewModelBase
{
    public override string Title => "Live Chart";
    public override string PhaseNote => "Full-screen live chart arrives in Phase 2 with the tick simulator and candle builder.";
}

public sealed class SignalHistoryViewModel : PlaceholderViewModelBase
{
    public override string Title => "Signal History";
    public override string PhaseNote => "Signal history arrives in Phase 3 once the signal generation engine exists.";
}

public sealed class PaperTradingViewModel : PlaceholderViewModelBase
{
    public override string Title => "Paper Trading";
    public override string PhaseNote => "Paper trading mode arrives in Phase 4 with the risk-management engine.";
}

public sealed class QuotexAssistantViewModel : PlaceholderViewModelBase
{
    public override string Title => "Quotex Assistant";
    public override string PhaseNote => "The manual-confirmation Quotex assistant workflow arrives in Phase 4. It will never place trades automatically.";
}

public sealed class BacktestingViewModel : PlaceholderViewModelBase
{
    public override string Title => "Backtesting";
    public override string PhaseNote => "The non-repainting backtesting engine and CSV import arrive in Phase 5.";
}

public sealed class TradingJournalViewModel : PlaceholderViewModelBase
{
    public override string Title => "Trading Journal";
    public override string PhaseNote => "The trading journal (search, filters, export, reports) arrives in Phase 6.";
}

public sealed class PerformanceAnalyticsViewModel : PlaceholderViewModelBase
{
    public override string Title => "Performance Analytics";
    public override string PhaseNote => "Performance analytics dashboards arrive in Phase 6.";
}

public sealed class StrategySettingsViewModel : PlaceholderViewModelBase
{
    public override string Title => "Strategy Settings";
    public override string PhaseNote => "Strategy parameter editing arrives in Phase 6, backed by the seeded StrategyConfiguration entity.";
}

public sealed class RiskSettingsViewModel : PlaceholderViewModelBase
{
    public override string Title => "Risk Settings";
    public override string PhaseNote => "Risk-management configuration (loss limits, cooldowns, emergency stop reset) arrives in Phase 4/6.";
}

public sealed class DataProviderSettingsViewModel : PlaceholderViewModelBase
{
    public override string Title => "Data Provider Settings";
    public override string PhaseNote => "Data-provider selection and health thresholds arrive in Phase 2.";
}

public sealed class ApplicationLogsViewModel : PlaceholderViewModelBase
{
    public override string Title => "Application Logs";
    public override string PhaseNote => "The in-app log viewer arrives in Phase 6. Logs are already being written to the Logs/ folder via Serilog.";
}

public sealed class BackupRestoreViewModel : PlaceholderViewModelBase
{
    public override string Title => "Backup & Restore";
    public override string PhaseNote => "Database backup/restore arrives in Phase 6.";
}

public sealed class AboutViewModel : PlaceholderViewModelBase
{
    public override string Title => "About & Risk Warning";

    public override string PhaseNote => string.Empty;

    public override string ExtraNote =>
        "FX Volume Trader is a signal-assistance and analysis tool. It does not place trades on your behalf on any " +
        "platform without official, authorized broker API access and, even then, only when you explicitly enable " +
        "automatic execution for that broker. Signals, confidence scores, and backtest results are estimates based " +
        "on historical and live market data - they are not guarantees of accuracy or profit, and past performance " +
        "does not indicate future results. Trading binary/digital options carries a high risk of loss. Only trade " +
        "with money you can afford to lose.";
}
