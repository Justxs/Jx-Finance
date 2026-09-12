using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Notifications.Interfaces;
using JxFinance.Endpoints.Notifications.Mappers;
using JxFinance.Endpoints.Notifications.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Notifications.Services;

public sealed class NotificationService(AppDbContext db, NotificationMapper mapper) : INotificationService
{
    public async Task<IReadOnlyList<NotificationResponse>> GetAllAsync(
        bool? unreadOnly,
        CancellationToken cancellationToken)
    {
        var query = db.Notifications.AsQueryable();
        if (unreadOnly is true)
        {
            query = query.Where(n => !n.IsRead);
        }

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);

        return notifications.Select(mapper.FromEntity).ToList();
    }

    public async Task<Result<Guid>> MarkReadAsync(Guid id, CancellationToken cancellationToken)
    {
        var notificationId = new NotificationId(id);
        var notification = await db.Notifications.FirstOrDefaultAsync(
            n => n.Id == notificationId,
            cancellationToken);
        if (notification is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Notification not found.");
        }

        notification.IsRead = true;
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task MarkAllReadAsync(CancellationToken cancellationToken)
    {
        await db.Notifications
            .Where(n => !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true), cancellationToken);
    }
}
