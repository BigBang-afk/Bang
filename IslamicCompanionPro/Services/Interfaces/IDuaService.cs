using IslamicCompanionPro.Models;

namespace IslamicCompanionPro.Services.Interfaces;

public interface IDuaService
{
	Task<List<DuaCategory>> GetCategoriesAsync();
	Task<List<Dua>> GetDuasByCategoryAsync(int categoryId);
	Task<Dua?> GetDuaAsync(int duaId);
	Task<List<Dua>> SearchAsync(string query);

	Task<bool> ToggleFavoriteAsync(int duaId);
	Task<List<Favorite>> GetFavoriteDuasAsync();
	Task<bool> IsFavoriteAsync(int duaId);
}
