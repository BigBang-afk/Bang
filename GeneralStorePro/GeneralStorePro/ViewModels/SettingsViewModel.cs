using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Dapper;
using GeneralStorePro.Data;
using GeneralStorePro.Data.Repositories;
using Microsoft.Win32;

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

    [ObservableProperty]
    private string? backupStatusMessage;

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

    [RelayCommand]
    private void BackupDatabase()
    {
        var dialog = new SaveFileDialog
        {
            Title = "Backup Database",
            Filter = "SQLite Database (*.db)|*.db",
            FileName = $"GeneralStorePro-Backup-{DateTime.Now:yyyyMMdd-HHmmss}.db"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        try
        {
            BackupService.BackupTo(dialog.FileName);

            using var connection = DbConnectionFactory.CreateConnection();
            connection.Execute(
                "UPDATE Settings SET SettingValue = @Value WHERE SettingKey = 'LastBackupDate';",
                new { Value = DateTime.Now.ToString("g") });

            BackupStatusMessage = $"Backup saved to {dialog.FileName}";
        }
        catch (Exception ex)
        {
            BackupStatusMessage = $"Backup failed: {ex.Message}";
        }
    }

    [RelayCommand]
    private void RestoreDatabase()
    {
        var dialog = new OpenFileDialog
        {
            Title = "Restore Database",
            Filter = "SQLite Database (*.db)|*.db"
        };

        if (dialog.ShowDialog() != true)
        {
            return;
        }

        var confirm = MessageBox.Show(
            "Restoring will replace all current data with the selected backup, and the application will restart. Continue?",
            "Confirm Restore",
            MessageBoxButton.YesNo,
            MessageBoxImage.Warning);

        if (confirm != MessageBoxResult.Yes)
        {
            return;
        }

        try
        {
            BackupService.RestoreFrom(dialog.FileName);

            var processPath = Environment.ProcessPath;
            if (!string.IsNullOrEmpty(processPath))
            {
                Process.Start(processPath);
            }

            Application.Current.Shutdown();
        }
        catch (Exception ex)
        {
            BackupStatusMessage = $"Restore failed: {ex.Message}";
        }
    }
}
