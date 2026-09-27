using JxFinance.Domain.Common;

namespace JxFinance.Domain.Notifications;

public readonly record struct DiscordWebhookId(Guid Value) : IStronglyTypedId<DiscordWebhookId>
{
    public static DiscordWebhookId From(Guid value) => new(value);

    public static DiscordWebhookId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
