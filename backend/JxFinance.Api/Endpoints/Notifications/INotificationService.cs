using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Notifications;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationResponse>> GetAllAsync(bool? unreadOnly, CancellationToken cancellationToken);

    Task<Result<Guid>> MarkReadAsync(Guid id, CancellationToken cancellationToken);

    Task MarkAllReadAsync(CancellationToken cancellationToken);
}
