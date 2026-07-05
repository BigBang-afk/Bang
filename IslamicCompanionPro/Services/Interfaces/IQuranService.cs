using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IQuranService
{
	Task<List<QuranSurah>> GetSurahsAsync();
	Task<QuranSurah?> GetSurahAsync(int surahNumber);
	Task<List<QuranAyah>> GetAyahsBySurahAsync(int surahNumber);
	Task<List<QuranAyah>> GetAyahsByJuzAsync(int juzNumber);
	Task<string?> GetTranslationAsync(int globalAyahNumber, string languageCode);
	Task<Dictionary<int, string>> GetTranslationsForSurahAsync(int surahNumber, string languageCode);

	/// <summary>
	/// Searches by exact "surah:ayah" reference (e.g. "2:5"), by Surah name (English/transliteration/Arabic),
	/// or by keyword found in any stored translation.
	/// </summary>
	Task<List<QuranAyah>> SearchAsync(string query);

	Task SetLastReadAsync(int globalAyahNumber);
	Task<Bookmark?> GetLastReadAsync();

	Task AddBookmarkAsync(int globalAyahNumber, string? note = null);
	Task RemoveBookmarkAsync(int bookmarkId);
	Task<List<Bookmark>> GetBookmarksAsync();

	Task<bool> ToggleFavoriteAsync(int globalAyahNumber);
	Task<List<Favorite>> GetFavoriteAyahsAsync();
	Task<bool> IsFavoriteAsync(int globalAyahNumber);
}
