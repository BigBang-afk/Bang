using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

public class DuaService : IDuaService
{
	private readonly ISQLiteDatabaseService _db;

	public DuaService(ISQLiteDatabaseService db)
	{
		_db = db;
	}

	public async Task<List<DuaCategory>> GetCategoriesAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<DuaCategory>().OrderBy(c => c.SortOrder).ToListAsync();
	}

	public async Task<List<Dua>> GetDuasByCategoryAsync(int categoryId)
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<Dua>()
			.Where(d => d.CategoryId == categoryId)
			.OrderBy(d => d.SortOrder)
			.ToListAsync();
	}

	public async Task<Dua?> GetDuaAsync(int duaId)
	{
		await _db.InitializeAsync();
		return await _db.FindAsync<Dua>(duaId);
	}

	public async Task<List<Dua>> SearchAsync(string query)
	{
		await _db.InitializeAsync();
		query = query.Trim();
		if (string.IsNullOrEmpty(query))
		{
			return new List<Dua>();
		}

		return await _db.Connection.Table<Dua>()
			.Where(d => d.Title.Contains(query) ||
						d.TranslationEnglish.Contains(query) ||
						d.TranslationUrdu.Contains(query) ||
						d.TextArabic.Contains(query) ||
						d.Transliteration.Contains(query))
			.ToListAsync();
	}

	public async Task<bool> ToggleFavoriteAsync(int duaId)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Dua && f.ItemId == duaId)
			.FirstOrDefaultAsync();

		if (existing is not null)
		{
			await _db.DeleteAsync(existing);
			return false;
		}

		await _db.InsertAsync(new Favorite { ItemType = BookmarkItemType.Dua, ItemId = duaId });
		return true;
	}

	public async Task<List<Favorite>> GetFavoriteDuasAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Dua)
			.OrderByDescending(f => f.CreatedAtUtc)
			.ToListAsync();
	}

	public async Task<bool> IsFavoriteAsync(int duaId)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Dua && f.ItemId == duaId)
			.FirstOrDefaultAsync();
		return existing is not null;
	}
}
