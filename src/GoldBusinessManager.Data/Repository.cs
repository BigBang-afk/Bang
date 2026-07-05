using GoldBusinessManager.Core.Interfaces;

namespace GoldBusinessManager.Data;

/// <summary>
/// Generic async CRUD repository shared by every entity. Register one closed
/// generic instance per entity in MauiProgram.cs, e.g.
/// builder.Services.AddSingleton&lt;IRepository&lt;Customer&gt;, Repository&lt;Customer&gt;&gt;();
/// </summary>
public class Repository<T> : IRepository<T> where T : class, new()
{
    private readonly DatabaseService _databaseService;

    public Repository(DatabaseService databaseService)
    {
        _databaseService = databaseService;
    }

    public async Task<List<T>> GetAllAsync()
    {
        try
        {
            await _databaseService.InitializeAsync();
            return await _databaseService.Connection.Table<T>().ToListAsync();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to load {typeof(T).Name} records.", ex);
        }
    }

    public async Task<T?> GetByIdAsync(int id)
    {
        try
        {
            await _databaseService.InitializeAsync();
            return await _databaseService.Connection.FindAsync<T>(id);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to load {typeof(T).Name} with Id {id}.", ex);
        }
    }

    public async Task<int> InsertAsync(T entity)
    {
        try
        {
            await _databaseService.InitializeAsync();
            return await _databaseService.Connection.InsertAsync(entity);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to save the new {typeof(T).Name} record.", ex);
        }
    }

    public async Task<int> UpdateAsync(T entity)
    {
        try
        {
            await _databaseService.InitializeAsync();
            return await _databaseService.Connection.UpdateAsync(entity);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to update the {typeof(T).Name} record.", ex);
        }
    }

    public async Task<int> DeleteAsync(T entity)
    {
        try
        {
            await _databaseService.InitializeAsync();
            return await _databaseService.Connection.DeleteAsync(entity);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to delete the {typeof(T).Name} record.", ex);
        }
    }
}
