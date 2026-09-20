using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public readonly record struct NotificationId(Guid Value) : IStronglyTypedId<NotificationId>
{
    public static NotificationId From(Guid value) => new(value);

    public static NotificationId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
