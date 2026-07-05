using System.Security.Cryptography;
using System.Text;
using GoldBusinessManager.Core.Entities;
using GoldBusinessManager.Core.Enums;
using SQLite;

namespace GoldBusinessManager.Data;

/// <summary>
/// Owns the single SQLite connection for the app, creates every table on first
/// run, and seeds the data a brand-new install needs (default admin PIN,
/// default settings row, one GoldStock row per item type).
///
/// Registered as a singleton in MauiProgram.cs so the whole app shares one
/// open connection, and injected into every Repository&lt;T&gt;.
/// </summary>
public class DatabaseService
{
    private readonly SQLiteAsyncConnection _connection;
    private bool _isInitialized;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    /// <summary>Default admin PIN for a brand-new install. Shown to the user once and should be changed immediately.</summary>
    public const string DefaultAdminPin = "1234";

    public DatabaseService(string databasePath)
    {
        _connection = new SQLiteAsyncConnection(databasePath, GetFlags());
    }

    public SQLiteAsyncConnection Connection => _connection;

    private static SQLiteOpenFlags GetFlags() =>
        SQLiteOpenFlags.ReadWrite | SQLiteOpenFlags.Create | SQLiteOpenFlags.SharedCache;

    /// <summary>
    /// Creates all tables (if they don't already exist) and seeds default rows.
    /// Safe to call every app start — CreateTableAsync is a no-op when the table exists,
    /// and the seed methods check for existing data before inserting.
    /// </summary>
    public async Task InitializeAsync()
    {
        if (_isInitialized) return;

        await _initLock.WaitAsync();
        try
        {
            if (_isInitialized) return;

            await _connection.CreateTableAsync<User>();
            await _connection.CreateTableAsync<Customer>();
            await _connection.CreateTableAsync<Supplier>();
            await _connection.CreateTableAsync<SalesInvoice>();
            await _connection.CreateTableAsync<Purchase>();
            await _connection.CreateTableAsync<GoldStock>();
            await _connection.CreateTableAsync<GoldStockMovement>();
            await _connection.CreateTableAsync<CashTransaction>();
            await _connection.CreateTableAsync<BankAccount>();
            await _connection.CreateTableAsync<BankTransaction>();
            await _connection.CreateTableAsync<Expense>();
            await _connection.CreateTableAsync<AppSetting>();

            await SeedDefaultAdminAsync();
            await SeedDefaultSettingsAsync();
            await SeedGoldStockRowsAsync();

            _isInitialized = true;
        }
        finally
        {
            _initLock.Release();
        }
    }

    private async Task SeedDefaultAdminAsync()
    {
        var existingAdmin = await _connection.Table<User>()
            .Where(u => u.Username == "admin")
            .FirstOrDefaultAsync();

        if (existingAdmin is not null) return;

        await _connection.InsertAsync(new User
        {
            FullName = "Shop Admin",
            Username = "admin",
            PinHash = HashPin(DefaultAdminPin),
            Role = UserRole.Admin,
            IsActive = true,
            CanManageSales = true,
            CanManagePurchases = true,
            CanManageStock = true,
            CanManageLedgers = true,
            CanManageExpenses = true,
            CanManageReports = true,
            CanManageSettings = true
        });
    }

    private async Task SeedDefaultSettingsAsync()
    {
        var existing = await _connection.Table<AppSetting>().FirstOrDefaultAsync();
        if (existing is not null) return;

        await _connection.InsertAsync(new AppSetting { Id = 1 });
    }

    private async Task SeedGoldStockRowsAsync()
    {
        var existingTypes = (await _connection.Table<GoldStock>().ToListAsync())
            .Select(s => s.ItemType)
            .ToHashSet();

        foreach (var itemType in Enum.GetValues<ItemType>())
        {
            if (existingTypes.Contains(itemType)) continue;

            await _connection.InsertAsync(new GoldStock
            {
                ItemType = itemType,
                WeightInGrams = 0
            });
        }
    }

    /// <summary>Hashes a PIN with SHA-256 so the plain PIN is never stored or compared directly.</summary>
    public static string HashPin(string pin)
    {
        var bytes = Encoding.UTF8.GetBytes(pin);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    public static bool VerifyPin(string pin, string pinHash) => HashPin(pin) == pinHash;
}
