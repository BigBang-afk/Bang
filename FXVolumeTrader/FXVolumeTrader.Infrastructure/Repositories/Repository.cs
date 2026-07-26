using System.Linq.Expressions;
using FXVolumeTrader.Core.Interfaces;
using FXVolumeTrader.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FXVolumeTrader.Infrastructure.Repositories;

/// <summary>
/// EF Core-backed implementation of IRepository&lt;T&gt;. Registered as
/// open-generic in DI so any entity gets repository support without a
/// hand-written class per entity.
/// </summary>
public class Repository<TEntity> : IRepository<TEntity> where TEntity : class
{
    private readonly ApplicationDbContext _context;
    private readonly DbSet<TEntity> _set;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
        _set = context.Set<TEntity>();
    }

    public async Task<TEntity?> GetByIdAsync(object id, CancellationToken cancellationToken = default) =>
        await _set.FindAsync(new[] { id }, cancellationToken);

    public async Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _set.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<TEntity>> FindAsync(
        Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken = default) =>
        await _set.AsNoTracking().Where(predicate).ToListAsync(cancellationToken);

    public async Task AddAsync(TEntity entity, CancellationToken cancellationToken = default) =>
        await _set.AddAsync(entity, cancellationToken);

    public void Update(TEntity entity) => _set.Update(entity);

    public void Remove(TEntity entity) => _set.Remove(entity);

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
