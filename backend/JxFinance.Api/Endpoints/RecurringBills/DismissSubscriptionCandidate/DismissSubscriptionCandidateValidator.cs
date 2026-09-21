using FastEndpoints;
using JxFinance.Common.Subscriptions;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;

public sealed class DismissSubscriptionCandidateValidator : Validator<DismissSubscriptionCandidateRequest>
{
    public DismissSubscriptionCandidateValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Description).IsRequired().HasMaxLength(SubscriptionDescription.MaxLength);
    }
}
