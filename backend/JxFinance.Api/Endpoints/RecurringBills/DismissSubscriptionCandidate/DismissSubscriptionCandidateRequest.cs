namespace JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;

public sealed record DismissSubscriptionCandidateRequest(Guid AccountId, string Description);
