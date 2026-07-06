using System.Windows.Input;
using TradingJournal.App.Common;
using TradingJournal.Core.Services;

namespace TradingJournal.App.ViewModels;

public class SettingsViewModel : ViewModelBase
{
    private readonly ISettingsService _settingsService;
    private readonly Action _onSaved;

    public SettingsViewModel(ISettingsService settingsService, Action onSaved)
    {
        _settingsService = settingsService;
        _onSaved = onSaved;

        SaveCommand = new RelayCommand(async () => await SaveAsync());
        _ = LoadAsync();
    }

    private string _usdToPkrRateText = string.Empty;
    public string UsdToPkrRateText
    {
        get => _usdToPkrRateText;
        set => SetProperty(ref _usdToPkrRateText, value);
    }

    private string _goldRateText = string.Empty;
    public string GoldRateText
    {
        get => _goldRateText;
        set => SetProperty(ref _goldRateText, value);
    }

    private string _goldUnitLabel = "Tola";
    public string GoldUnitLabel
    {
        get => _goldUnitLabel;
        set => SetProperty(ref _goldUnitLabel, value);
    }

    private string? _statusMessage;
    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    private string? _errorMessage;
    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public ICommand SaveCommand { get; }

    private async Task LoadAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        UsdToPkrRateText = settings.UsdToPkrRate.ToString("0.####");
        GoldRateText = settings.GoldRatePerUnit.ToString("0.####");
        GoldUnitLabel = settings.GoldUnitLabel;
    }

    private async Task SaveAsync()
    {
        ErrorMessage = null;
        StatusMessage = null;

        if (!decimal.TryParse(UsdToPkrRateText, out var usdRate) || usdRate <= 0)
        {
            ErrorMessage = "Enter a valid USD to PKR rate greater than zero.";
            return;
        }

        if (!decimal.TryParse(GoldRateText, out var goldRate) || goldRate <= 0)
        {
            ErrorMessage = "Enter a valid gold rate greater than zero.";
            return;
        }

        try
        {
            await _settingsService.UpdateSettingsAsync(usdRate, goldRate, GoldUnitLabel);
            StatusMessage = "Settings saved.";
            _onSaved();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }
}
