using GoldLedgerApp.Models;
using SQLite;

namespace GoldLedgerApp.Services;

public class DatabaseService
{
	private readonly SQLiteAsyncConnection _db;
	private bool _initialized;

	public DatabaseService(string dbPath)
	{
		_db = new SQLiteAsyncConnection(dbPath);
	}

	public async Task InitializeAsync()
	{
		if (_initialized) return;

		await _db.CreateTableAsync<Customer>();
		await _db.CreateTableAsync<GoldTransaction>();
		await _db.CreateTableAsync<LedgerEntry>();
		await _db.CreateTableAsync<GoldRate>();

		_initialized = true;
	}

	// ---------- Customers ----------

	public async Task<List<Customer>> GetCustomersAsync(string? search = null)
	{
		await InitializeAsync();
		var customers = string.IsNullOrWhiteSpace(search)
			? await _db.Table<Customer>().OrderBy(c => c.Name).ToListAsync()
			: await _db.Table<Customer>()
				.Where(c => c.Name.Contains(search) || c.Phone.Contains(search))
				.OrderBy(c => c.Name)
				.ToListAsync();

		foreach (var customer in customers)
		{
			customer.CurrentBalance = await GetCustomerBalanceAsync(customer.Id);
		}

		return customers;
	}

	public async Task<Customer?> GetCustomerAsync(int id)
	{
		await InitializeAsync();
		return await _db.FindAsync<Customer>(id);
	}

	public async Task<int> SaveCustomerAsync(Customer customer)
	{
		await InitializeAsync();
		if (customer.Id == 0)
			return await _db.InsertAsync(customer);
		return await _db.UpdateAsync(customer);
	}

	public async Task DeleteCustomerAsync(Customer customer)
	{
		await _db.Table<LedgerEntry>().DeleteAsync(e => e.CustomerId == customer.Id);
		await _db.DeleteAsync(customer);
	}

	public async Task<decimal> GetCustomerBalanceAsync(int customerId)
	{
		await InitializeAsync();
		var customer = await _db.FindAsync<Customer>(customerId);
		var opening = customer?.OpeningBalance ?? 0m;

		var entries = await _db.Table<LedgerEntry>().Where(e => e.CustomerId == customerId).ToListAsync();
		var debit = entries.Where(e => e.Type == LedgerEntryType.Debit).Sum(e => e.Amount);
		var credit = entries.Where(e => e.Type == LedgerEntryType.Credit).Sum(e => e.Amount);

		return opening + debit - credit;
	}

	public async Task<decimal> GetTotalOutstandingAsync()
	{
		var customers = await _db.Table<Customer>().ToListAsync();
		decimal total = 0;
		foreach (var c in customers)
			total += await GetCustomerBalanceAsync(c.Id);
		return total;
	}

	// ---------- Ledger ----------

	public async Task<List<LedgerEntry>> GetLedgerEntriesAsync(int customerId)
	{
		await InitializeAsync();
		return await _db.Table<LedgerEntry>()
			.Where(e => e.CustomerId == customerId)
			.OrderByDescending(e => e.Date)
			.ThenByDescending(e => e.Id)
			.ToListAsync();
	}

	public async Task<LedgerEntry> AddLedgerEntryAsync(
		int customerId,
		LedgerEntryType type,
		decimal amount,
		LedgerReferenceType referenceType,
		int? referenceId,
		string notes,
		DateTime? date = null)
	{
		await InitializeAsync();
		var balance = await GetCustomerBalanceAsync(customerId);
		var newBalance = type == LedgerEntryType.Debit ? balance + amount : balance - amount;

		var entry = new LedgerEntry
		{
			CustomerId = customerId,
			Date = date ?? DateTime.Now,
			Type = type,
			Amount = amount,
			ReferenceType = referenceType,
			ReferenceId = referenceId,
			Notes = notes,
			RunningBalance = newBalance
		};

		await _db.InsertAsync(entry);
		return entry;
	}

	// ---------- Gold Transactions ----------

	public async Task<int> SaveGoldTransactionAsync(GoldTransaction transaction)
	{
		await InitializeAsync();
		await _db.InsertAsync(transaction);

		if (transaction.CustomerId.HasValue && transaction.BalanceDue != 0)
		{
			var entryType = transaction.Type == TransactionType.Sell
				? LedgerEntryType.Debit
				: LedgerEntryType.Credit;

			var notes = transaction.Type == TransactionType.Sell
				? $"Sale #{transaction.Id} balance due"
				: $"Purchase #{transaction.Id} amount payable";

			await AddLedgerEntryAsync(
				transaction.CustomerId.Value,
				entryType,
				Math.Abs(transaction.BalanceDue),
				LedgerReferenceType.GoldTransaction,
				transaction.Id,
				notes,
				transaction.Date);
		}

		return transaction.Id;
	}

	public async Task<List<GoldTransaction>> GetTransactionsAsync(
		TransactionType? type = null,
		DateTime? from = null,
		DateTime? to = null,
		int? customerId = null)
	{
		await InitializeAsync();
		var all = await _db.Table<GoldTransaction>().ToListAsync();
		var filtered = all.AsEnumerable();

		if (type.HasValue)
			filtered = filtered.Where(t => t.Type == type.Value);
		if (from.HasValue)
			filtered = filtered.Where(t => t.Date.Date >= from.Value.Date);
		if (to.HasValue)
			filtered = filtered.Where(t => t.Date.Date <= to.Value.Date);
		if (customerId.HasValue)
			filtered = filtered.Where(t => t.CustomerId == customerId.Value);

		var result = filtered.OrderByDescending(t => t.Date).ThenByDescending(t => t.Id).ToList();

		var customers = await _db.Table<Customer>().ToListAsync();
		foreach (var t in result)
		{
			t.CustomerName = t.CustomerId.HasValue
				? customers.FirstOrDefault(c => c.Id == t.CustomerId.Value)?.Name ?? "Unknown"
				: "Walk-in";
		}

		return result;
	}

	public async Task<GoldTransaction?> GetTransactionAsync(int id)
	{
		await InitializeAsync();
		return await _db.FindAsync<GoldTransaction>(id);
	}

	// ---------- Gold Rate ----------

	public async Task<GoldRate?> GetLatestRateAsync()
	{
		await InitializeAsync();
		return (await _db.Table<GoldRate>().OrderByDescending(r => r.Date).Take(1).ToListAsync())
			.FirstOrDefault();
	}

	public async Task<int> SaveRateAsync(decimal ratePerGram24K)
	{
		await InitializeAsync();
		var rate = new GoldRate { Date = DateTime.Now, RatePerGram24K = ratePerGram24K };
		return await _db.InsertAsync(rate);
	}

	public async Task<List<GoldRate>> GetRateHistoryAsync(int take = 30)
	{
		await InitializeAsync();
		return await _db.Table<GoldRate>().OrderByDescending(r => r.Date).Take(take).ToListAsync();
	}

	// ---------- Dashboard / Reports ----------

	public async Task<(decimal totalBuy, decimal totalSell, int buyCount, int sellCount)> GetSummaryAsync(
		DateTime from, DateTime to)
	{
		var transactions = await GetTransactionsAsync(from: from, to: to);
		var buy = transactions.Where(t => t.Type == TransactionType.Buy).ToList();
		var sell = transactions.Where(t => t.Type == TransactionType.Sell).ToList();

		return (
			buy.Sum(t => t.TotalAmount),
			sell.Sum(t => t.TotalAmount),
			buy.Count,
			sell.Count);
	}
}
