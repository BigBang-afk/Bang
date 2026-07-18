using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;

namespace ZarghoonJewellers.Business.Services;

/// <summary>
/// Default <see cref="ICrudService{TEntity}"/> implementation. Relies on the DI container
/// resolving <see cref="IGenericRepository{TEntity}"/> and <see cref="IUnitOfWork"/> from the
/// same scope so they share one underlying DbContext - SaveChangesAsync on the unit of work
/// persists whatever the repository tracked.
/// </summary>
public class CrudService<TEntity> : ICrudService<TEntity> where TEntity : class
{
    private readonly IGenericRepository<TEntity> _repository;
    private readonly IUnitOfWork _unitOfWork;

    public CrudService(IGenericRepository<TEntity> repository, IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
    }

    public Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken cancellationToken = default)
        => _repository.GetAllAsync(cancellationToken);

    public Task<TEntity?> GetByIdAsync(object id, CancellationToken cancellationToken = default)
        => _repository.GetByIdAsync(id, cancellationToken);

    public async Task<TEntity> CreateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        await _repository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task UpdateAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _repository.Update(entity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        _repository.Remove(entity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
