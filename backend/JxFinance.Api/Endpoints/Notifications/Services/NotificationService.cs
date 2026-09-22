using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Endpoints.Notifications.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Notifications.Services;

[RegisterService<INotificationService>(LifeTime.Scoped)]
public sealed class NotificationService(AppDbContext db) : INotificationService
{
    public async Task<IReadOnlyList<Notification>> GetAllAsync(
        bool? unreadOnly,
        CancellationToken cancellationToken)
    {
        var query = db.Notifications.AsQueryable();
        if (unreadOnly is true)
        {
            query = query.Where(n => !n.IsRead);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Result<Guid>> MarkReadAsync(Guid id, CancellationToken cancellationToken)
    {
        var notificationId = new NotificationId(id);
        var found = await db.Notifications.FindOrNotFoundAsync(
            n => n.Id == notificationId,
            "Notification not found.",
            cancellationToken);
        if (!found.TryGetValue(out var notification))
        {
            return found.Error;
        }

        notification.IsRead = true;
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    public async Task MarkAllReadAsync(CancellationToken cancellationToken)
    {
        await db.Notifications
            .Where(n => !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true), cancellationToken);
    }
}
