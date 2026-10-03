namespace JxFinance.Domain.Notifications;

public interface IChatMessage
{
    Guid UserId { get; }
    NotificationType NotificationType { get; }
    string Content { get; }
}
