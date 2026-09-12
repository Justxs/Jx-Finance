using JxFinance.Domain.Common;
using JxFinance.Endpoints.Notifications.Shared;

namespace JxFinance.Endpoints.Notifications.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationResponse>> GetAllAsync(bool? unreadOnly, CancellationToken cancellationToken);

    Task<Result<Guid>> MarkReadAsync(Guid id, CancellationToken cancellationToken);

    Task MarkAllReadAsync(CancellationToken cancellationToken);
}
