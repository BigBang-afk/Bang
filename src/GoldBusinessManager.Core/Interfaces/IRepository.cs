namespace GoldBusinessManager.Core.Interfaces;

/// <summary>
/// Generic async CRUD contract implemented by GoldBusinessManager.Data.Repository&lt;T&gt;
/// for every entity in Core.Entities.
/// </summary>
public interface IRepository<T> where T : class, new()
{
    Task<List<T>> GetAllAsync();

    Task<T?> GetByIdAsync(int id);

    Task<int> InsertAsync(T entity);

    Task<int> UpdateAsync(T entity);

    Task<int> DeleteAsync(T entity);
}
