using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Interfaces;

public interface IRepairOrderService
{
    Task<IReadOnlyList<RepairOrder>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RepairOrder>> GetPendingAsync(int count, CancellationToken cancellationToken = default);
    Task<RepairOrder> CreateAsync(RepairOrder order, CancellationToken cancellationToken = default);
    Task UpdateStatusAsync(int repairOrderId, string newStatus, CancellationToken cancellationToken = default);
    Task UpdateAsync(RepairOrder order, CancellationToken cancellationToken = default);
}
