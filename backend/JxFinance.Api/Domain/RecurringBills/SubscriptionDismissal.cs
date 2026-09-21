using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.RecurringBills;

public sealed class SubscriptionDismissal : OwnableEntity
{
    public SubscriptionDismissalId Id { get; set; } = SubscriptionDismissalId.New();
    public AccountId AccountId { get; set; }
    public required string Description { get; set; }
}
