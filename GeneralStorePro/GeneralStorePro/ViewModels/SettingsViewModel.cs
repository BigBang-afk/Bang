using System.Collections.Generic;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Dapper;
using GeneralStorePro.Data;
using GeneralStorePro.Data.Repositories;

namespace GeneralStorePro.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    [ObservableProperty]
    private string storeName = string.Empty;

    [ObservableProperty]
    private string storeAddress = string.Empty;

    [ObservableProperty]
    private string storePhone = string.Empty;

    [ObservableProperty]
    private string currencySymbol = "$";

    [ObservableProperty]
    private string taxRatePercent = "0";

    [ObservableProperty]
    private string invoicePrefix = "INV-";

    [ObservableProperty]
    private string purchasePrefix = "PUR-";

    [ObservableProperty]
    private string lowStockThreshold = "5";

    [ObservableProperty]
    private string? statusMessage;

    public SettingsViewModel()
    {
        LoadSettings();
    }

    private void LoadSettings()
    {
        var map = SettingsRepository.GetAll();

        StoreName = map.GetValueOrDefault("StoreName", StoreName);
        StoreAddress = map.GetValueOrDefault("StoreAddress", StoreAddress);
        StorePhone = map.GetValueOrDefault("StorePhone", StorePhone);
        CurrencySymbol = map.GetValueOrDefault("CurrencySymbol", CurrencySymbol);
        TaxRatePercent = map.GetValueOrDefault("TaxRatePercent", TaxRatePercent);
        InvoicePrefix = map.GetValueOrDefault("InvoicePrefix", InvoicePrefix);
        PurchasePrefix = map.GetValueOrDefault("PurchasePrefix", PurchasePrefix);
        LowStockThreshold = map.GetValueOrDefault("LowStockThreshold", LowStockThreshold);
    }

    [RelayCommand]
    private void Save()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        using var transaction = connection.BeginTransaction();

        void SaveSetting(string key, string value) =>
            connection.Execute(
                "UPDATE Settings SET SettingValue = @Value WHERE SettingKey = @Key;",
                new { Key = key, Value = value },
                transaction);

        SaveSetting("StoreName", StoreName);
        SaveSetting("StoreAddress", StoreAddress);
        SaveSetting("StorePhone", StorePhone);
        SaveSetting("CurrencySymbol", CurrencySymbol);
        SaveSetting("TaxRatePercent", TaxRatePercent);
        SaveSetting("InvoicePrefix", InvoicePrefix);
        SaveSetting("PurchasePrefix", PurchasePrefix);
        SaveSetting("LowStockThreshold", LowStockThreshold);

        transaction.Commit();
        StatusMessage = "Settings saved.";
    }
}
