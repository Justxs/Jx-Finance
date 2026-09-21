using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;

public sealed class DismissSubscriptionCandidateSummary : Summary<DismissSubscriptionCandidateEndpoint>
{
    public DismissSubscriptionCandidateSummary()
    {
        Summary = "Dismiss a subscription suggestion";
        Description = "Hides one suggested subscription for the signed-in user. The dismissal is stored "
            + "against the account and the normalized description the suggestion was grouped by, not against "
            + "the transactions behind it, so a new payment arriving in the same group does not bring the "
            + "suggestion back. Dismissing the same group twice changes nothing. It is a personal choice: "
            + "another member of the same household still sees the suggestion.";
        Responses[204] = "The suggestion will not be offered to you again.";
    }
}
