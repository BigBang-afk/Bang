using ZarghoonJewellers.Business.Interfaces;
using ZarghoonJewellers.Common.Exceptions;
using ZarghoonJewellers.DataAccess.Repositories.Interfaces;
using ZarghoonJewellers.Domain.Entities;

namespace ZarghoonJewellers.Business.Services;

public class RepairOrderService : IRepairOrderService
{
    private static readonly string[] ValidStatuses = { "Pending", "InProgress", "Completed", "Delivered", "Cancelled" };

    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public RepairOrderService(IUnitOfWork unitOfWork, IAuditService auditService)
    {
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<RepairOrder>> GetAllAsync(CancellationToken cancellationToken = default)
        => _unitOfWork.RepairOrders.GetAllAsync(cancellationToken);

    public Task<IReadOnlyList<RepairOrder>> GetPendingAsync(int count, CancellationToken cancellationToken = default)
        => _unitOfWork.RepairOrders.GetPendingAsync(count, cancellationToken);

    public async Task<RepairOrder> CreateAsync(RepairOrder order, CancellationToken cancellationToken = default)
    {
        order.OrderNumber = await _unitOfWork.RepairOrders.GenerateNextOrderNumberAsync(cancellationToken);
        order.Status = "Pending";
        order.ReceivedDate = DateTime.Now;
        order.CreatedDate = DateTime.Now;

        await _unitOfWork.RepairOrders.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(order.CreatedBy, "Insert", "RepairOrders", order.RepairOrderId.ToString(), null, order.OrderNumber, cancellationToken);
        return order;
    }

    public async Task UpdateStatusAsync(int repairOrderId, string newStatus, CancellationToken cancellationToken = default)
    {
        if (!ValidStatuses.Contains(newStatus))
            throw new BusinessRuleException($"'{newStatus}' is not a valid repair order status.");

        var order = await _unitOfWork.RepairOrders.GetByIdAsync(repairOrderId, cancellationToken)
            ?? throw new BusinessRuleException("Repair order not found.");

        var oldStatus = order.Status;
        order.Status = newStatus;
        if (newStatus == "Delivered")
            order.DeliveredDate = DateTime.Now;

        _unitOfWork.RepairOrders.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(null, "Update", "RepairOrders", repairOrderId.ToString(), oldStatus, newStatus, cancellationToken);
    }

    public async Task UpdateAsync(RepairOrder order, CancellationToken cancellationToken = default)
    {
        _unitOfWork.RepairOrders.Update(order);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync(null, "Update", "RepairOrders", order.RepairOrderId.ToString(), null, order.Status, cancellationToken);
    }
}
