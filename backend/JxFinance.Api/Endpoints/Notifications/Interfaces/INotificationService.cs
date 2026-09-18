using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Notifications.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<Notification>> GetAllAsync(bool? unreadOnly, CancellationToken cancellationToken);

    Task<Result<Guid>> MarkReadAsync(Guid id, CancellationToken cancellationToken);

    Task MarkAllReadAsync(CancellationToken cancellationToken);
}
