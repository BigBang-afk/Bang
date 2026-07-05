using IslamicCompanionPro.Models;
using IslamicCompanionPro.Models.Enums;
using IslamicCompanionPro.Services.Interfaces;

namespace IslamicCompanionPro.Services;

public class QuranService : IQuranService
{
	private readonly ISQLiteDatabaseService _db;

	public QuranService(ISQLiteDatabaseService db)
	{
		_db = db;
	}

	public async Task<List<QuranSurah>> GetSurahsAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<QuranSurah>().OrderBy(s => s.SurahNumber).ToListAsync();
	}

	public async Task<QuranSurah?> GetSurahAsync(int surahNumber)
	{
		await _db.InitializeAsync();
		return await _db.FindAsync<QuranSurah>(surahNumber);
	}

	public async Task<List<QuranAyah>> GetAyahsBySurahAsync(int surahNumber)
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<QuranAyah>()
			.Where(a => a.SurahNumber == surahNumber)
			.OrderBy(a => a.AyahNumber)
			.ToListAsync();
	}

	public async Task<List<QuranAyah>> GetAyahsByJuzAsync(int juzNumber)
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<QuranAyah>()
			.Where(a => a.JuzNumber == juzNumber)
			.OrderBy(a => a.GlobalAyahNumber)
			.ToListAsync();
	}

	public async Task<string?> GetTranslationAsync(int globalAyahNumber, string languageCode)
	{
		await _db.InitializeAsync();
		var translation = await _db.Connection.Table<QuranTranslation>()
			.Where(t => t.GlobalAyahNumber == globalAyahNumber && t.LanguageCode == languageCode)
			.FirstOrDefaultAsync();
		return translation?.Text;
	}

	public async Task<Dictionary<int, string>> GetTranslationsForSurahAsync(int surahNumber, string languageCode)
	{
		await _db.InitializeAsync();
		var ayahs = await GetAyahsBySurahAsync(surahNumber);
		if (ayahs.Count == 0)
		{
			return new Dictionary<int, string>();
		}

		int minGlobal = ayahs.Min(a => a.GlobalAyahNumber);
		int maxGlobal = ayahs.Max(a => a.GlobalAyahNumber);

		var translations = await _db.Connection.Table<QuranTranslation>()
			.Where(t => t.LanguageCode == languageCode && t.GlobalAyahNumber >= minGlobal && t.GlobalAyahNumber <= maxGlobal)
			.ToListAsync();

		return translations.ToDictionary(t => t.GlobalAyahNumber, t => t.Text);
	}

	public async Task<List<QuranAyah>> SearchAsync(string query)
	{
		await _db.InitializeAsync();
		query = query.Trim();
		if (string.IsNullOrEmpty(query))
		{
			return new List<QuranAyah>();
		}

		// "surah:ayah" reference, e.g. "2:255"
		var refParts = query.Split(':', StringSplitOptions.TrimEntries);
		if (refParts.Length == 2 && int.TryParse(refParts[0], out int surahNum) && int.TryParse(refParts[1], out int ayahNum))
		{
			var exact = await _db.Connection.Table<QuranAyah>()
				.Where(a => a.SurahNumber == surahNum && a.AyahNumber == ayahNum)
				.ToListAsync();
			if (exact.Count > 0)
			{
				return exact;
			}
		}

		// Surah name match
		var surahs = await _db.Connection.Table<QuranSurah>()
			.Where(s => s.NameEnglish.Contains(query) || s.NameTransliteration.Contains(query) || s.NameArabic.Contains(query))
			.ToListAsync();
		if (surahs.Count > 0)
		{
			return await GetAyahsBySurahAsync(surahs[0].SurahNumber);
		}

		// Keyword search across translations (both languages), mapped back to their Ayahs
		var matches = await _db.Connection.Table<QuranTranslation>()
			.Where(t => t.Text.Contains(query))
			.ToListAsync();

		if (matches.Count == 0)
		{
			return new List<QuranAyah>();
		}

		var globalNumbers = matches.Select(m => m.GlobalAyahNumber).Distinct().ToList();
		var allAyahs = await _db.Connection.Table<QuranAyah>().ToListAsync();
		return allAyahs.Where(a => globalNumbers.Contains(a.GlobalAyahNumber)).OrderBy(a => a.GlobalAyahNumber).ToList();
	}

	public async Task SetLastReadAsync(int globalAyahNumber)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<Bookmark>()
			.Where(b => b.ItemType == BookmarkItemType.Ayah && b.IsLastRead)
			.FirstOrDefaultAsync();

		if (existing is null)
		{
			await _db.InsertAsync(new Bookmark { ItemType = BookmarkItemType.Ayah, ItemId = globalAyahNumber, IsLastRead = true });
		}
		else
		{
			existing.ItemId = globalAyahNumber;
			existing.CreatedAtUtc = DateTime.UtcNow;
			await _db.UpdateAsync(existing);
		}
	}

	public async Task<Bookmark?> GetLastReadAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<Bookmark>()
			.Where(b => b.ItemType == BookmarkItemType.Ayah && b.IsLastRead)
			.FirstOrDefaultAsync();
	}

	public async Task AddBookmarkAsync(int globalAyahNumber, string? note = null)
	{
		await _db.InitializeAsync();
		await _db.InsertAsync(new Bookmark
		{
			ItemType = BookmarkItemType.Ayah,
			ItemId = globalAyahNumber,
			IsLastRead = false,
			Note = note
		});
	}

	public async Task RemoveBookmarkAsync(int bookmarkId)
	{
		await _db.InitializeAsync();
		var bookmark = await _db.FindAsync<Bookmark>(bookmarkId);
		if (bookmark is not null)
		{
			await _db.DeleteAsync(bookmark);
		}
	}

	public async Task<List<Bookmark>> GetBookmarksAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<Bookmark>()
			.Where(b => b.ItemType == BookmarkItemType.Ayah && !b.IsLastRead)
			.OrderByDescending(b => b.CreatedAtUtc)
			.ToListAsync();
	}

	public async Task<bool> ToggleFavoriteAsync(int globalAyahNumber)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Ayah && f.ItemId == globalAyahNumber)
			.FirstOrDefaultAsync();

		if (existing is not null)
		{
			await _db.DeleteAsync(existing);
			return false;
		}

		await _db.InsertAsync(new Favorite { ItemType = BookmarkItemType.Ayah, ItemId = globalAyahNumber });
		return true;
	}

	public async Task<List<Favorite>> GetFavoriteAyahsAsync()
	{
		await _db.InitializeAsync();
		return await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Ayah)
			.OrderByDescending(f => f.CreatedAtUtc)
			.ToListAsync();
	}

	public async Task<bool> IsFavoriteAsync(int globalAyahNumber)
	{
		await _db.InitializeAsync();
		var existing = await _db.Connection.Table<Favorite>()
			.Where(f => f.ItemType == BookmarkItemType.Ayah && f.ItemId == globalAyahNumber)
			.FirstOrDefaultAsync();
		return existing is not null;
	}
}
