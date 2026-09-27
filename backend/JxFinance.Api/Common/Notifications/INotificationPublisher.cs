using JxFinance.Domain.Notifications;

namespace JxFinance.Common.Notifications;

public interface INotificationPublisher
{
    Task PreloadAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken);

    void Publish(Notification notification);
}
