using FlexXSignal.Application.Common;
using FlexXSignal.Application.Common.Interfaces;
using FlexXSignal.Application.Features.Admin;
using FlexXSignal.Domain.Entities;
using FlexXSignal.Domain.Enums;
using FlexXSignal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FlexXSignal.Infrastructure.Services;

public sealed class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly IDateTimeProvider _clock;
    private readonly IAuditLogService _auditLog;

    public AdminService(AppDbContext db, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole<Guid>> roleManager, IDateTimeProvider clock, IAuditLogService auditLog)
    {
        _db = db;
        _userManager = userManager;
        _roleManager = roleManager;
        _clock = clock;
        _auditLog = auditLog;
    }

    public async Task<Result<IReadOnlyList<AdminUserDto>>> GetUsersAsync(string? search, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email!.Contains(search) || u.DisplayName.Contains(search));

        var users = await query.OrderByDescending(u => u.CreatedAtUtc).Take(500).ToListAsync(ct);
        var results = new List<AdminUserDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var plan = await _db.UserSubscriptions.AsNoTracking().Include(s => s.SubscriptionPlan)
                .Where(s => s.UserId == user.Id && s.Status == SubscriptionStatus.Active)
                .OrderByDescending(s => s.EndsAtUtc).FirstOrDefaultAsync(ct);

            results.Add(new AdminUserDto(user.Id, user.Email!, user.DisplayName, user.IsActive, user.EmailConfirmed,
                roles.ToList(), user.CreatedAtUtc, user.LastLoginAtUtc, plan?.SubscriptionPlan?.Name));
        }

        return Result<IReadOnlyList<AdminUserDto>>.Success(results);
    }

    public async Task<Result> UpdateUserRolesAsync(Guid userId, UpdateUserRolesRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Result.Failure("User not found.");

        var currentRoles = await _userManager.GetRolesAsync(user);
        var toRemove = currentRoles.Except(request.Roles).ToList();
        var toAdd = request.Roles.Except(currentRoles).ToList();

        if (toRemove.Count > 0) await _userManager.RemoveFromRolesAsync(user, toRemove);
        if (toAdd.Count > 0) await _userManager.AddToRolesAsync(user, toAdd);

        await _auditLog.LogAsync(AuditAction.Update, nameof(ApplicationUser), userId.ToString(), new { Roles = currentRoles }, new { Roles = request.Roles }, "Role assignment updated", ct);
        return Result.Success();
    }

    public async Task<Result> SetUserActiveAsync(Guid userId, SetUserActiveRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null) return Result.Failure("User not found.");
        var old = user.IsActive;
        user.IsActive = request.IsActive;
        await _userManager.UpdateAsync(user);
        await _auditLog.LogAsync(AuditAction.Update, nameof(ApplicationUser), userId.ToString(), new { IsActive = old }, new { IsActive = request.IsActive }, null, ct);
        return Result.Success();
    }

    public Task<Result<IReadOnlyList<string>>> GetAvailableRolesAsync(CancellationToken ct = default) =>
        Task.FromResult(Result<IReadOnlyList<string>>.Success(Roles.All.ToList()));

    public async Task<Result<PagedResult<AuditLogDto>>> GetAuditLogsAsync(AuditLogFilter filter, CancellationToken ct = default)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (filter.FromUtc.HasValue) query = query.Where(a => a.OccurredAtUtc >= filter.FromUtc);
        if (filter.ToUtc.HasValue) query = query.Where(a => a.OccurredAtUtc <= filter.ToUtc);
        if (filter.Action.HasValue) query = query.Where(a => a.Action == filter.Action);
        if (!string.IsNullOrEmpty(filter.EntityName)) query = query.Where(a => a.EntityName == filter.EntityName);
        if (filter.ActorUserId.HasValue) query = query.Where(a => a.ActorUserId == filter.ActorUserId);

        var total = await query.CountAsync(ct);
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 200);
        var items = await query.OrderByDescending(a => a.OccurredAtUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Result<PagedResult<AuditLogDto>>.Success(new PagedResult<AuditLogDto>
        {
            Items = items.Select(a => new AuditLogDto(a.Id, a.ActorUserId, a.ActorDisplayName, a.Action, a.EntityName, a.EntityId, a.OldValueJson, a.NewValueJson, a.Reason, a.IpAddress, a.OccurredAtUtc)).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<Result<IReadOnlyList<SystemSettingDto>>> GetSettingsAsync(string? category, CancellationToken ct = default)
    {
        var query = _db.SystemSettings.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(s => s.Category == category);
        var settings = await query.OrderBy(s => s.Category).ThenBy(s => s.Key).ToListAsync(ct);
        return Result<IReadOnlyList<SystemSettingDto>>.Success(settings.Select(s =>
            new SystemSettingDto(s.Key, s.IsSecret ? "********" : s.Value, s.Category, s.DataType, s.Description, s.IsSecret)).ToList());
    }

    public async Task<Result> UpdateSettingAsync(UpdateSystemSettingRequest request, Guid adminUserId, CancellationToken ct = default)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == request.Key, ct);
        if (setting is null) return Result.Failure("Setting not found.");
        var old = setting.Value;
        setting.Value = request.Value;
        setting.UpdatedAtUtc = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _auditLog.LogAsync(AuditAction.ConfigurationChange, nameof(SystemSetting), setting.Key, new { Value = setting.IsSecret ? "***" : old }, new { Value = setting.IsSecret ? "***" : request.Value }, null, ct);
        return Result.Success();
    }

    public async Task<Result<AdminDashboardSummaryDto>> GetDashboardSummaryAsync(CancellationToken ct = default)
    {
        var today = _clock.UtcNow.Date;
        var totalUsers = await _db.Users.CountAsync(ct);
        var activeSubscriptions = await _db.UserSubscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active && s.EndsAtUtc > _clock.UtcNow, ct);
        var signalsToday = await _db.Signals.CountAsync(s => s.EntryTimeUtc >= today, ct);
        var verifiedToday = await _db.Signals.Where(s => s.EntryTimeUtc >= today && (s.Status == SignalStatus.Win || s.Status == SignalStatus.Loss || s.Status == SignalStatus.Tie)).ToListAsync(ct);
        var winRate = verifiedToday.Count == 0 ? 0 : Math.Round(100m * verifiedToday.Count(s => s.Status == SignalStatus.Win) / verifiedToday.Count, 2);
        var pendingPayments = await _db.PaymentRecords.CountAsync(p => p.Status == PaymentStatus.PendingReview, ct);
        var openTickets = await _db.SupportTickets.CountAsync(t => t.Status == SupportTicketStatus.Open || t.Status == SupportTicketStatus.InProgress, ct);
        var activeStrategies = await _db.Strategies.CountAsync(s => s.Status == StrategyStatus.Enabled, ct);
        var providerStatus = await _db.MarketDataProviderConfigurations.Where(c => c.IsActive).Select(c => c.LastKnownStatus).FirstOrDefaultAsync(ct);

        return Result<AdminDashboardSummaryDto>.Success(new AdminDashboardSummaryDto(
            totalUsers, activeSubscriptions, signalsToday, winRate, pendingPayments, openTickets, activeStrategies, providerStatus));
    }
}
