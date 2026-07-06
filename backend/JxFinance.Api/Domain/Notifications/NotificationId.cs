namespace JxFinance.Domain.Notifications;

public readonly record struct NotificationId(Guid Value)
{
    public static NotificationId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
