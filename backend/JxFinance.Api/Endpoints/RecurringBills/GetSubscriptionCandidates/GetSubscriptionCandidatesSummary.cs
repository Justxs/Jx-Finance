using FastEndpoints;
using JxFinance.Common.Subscriptions;

namespace JxFinance.Endpoints.RecurringBills.GetSubscriptionCandidates;

public sealed class GetSubscriptionCandidatesSummary : Summary<GetSubscriptionCandidatesEndpoint>
{
    public GetSubscriptionCandidatesSummary()
    {
        Summary = "Suggest subscriptions found in the ledger";
        Description = "Reads the expenses you can see from the last "
            + $"{SubscriptionDetection.LookBackMonths} months, groups them by a normalized description and "
            + "account, and answers the groups that look like a subscription: at least "
            + $"{SubscriptionDetection.MinimumOccurrences} occurrences, a gap between them that fits one "
            + "cadence, and amounts within a tolerance of their median. Call it to offer a ready-made "
            + "recurring entry. Groups an active recurring entry already covers and groups you dismissed are "
            + "left out. Nothing is written.";
        Responses[200] = "The subscription candidates, the soonest expected occurrence first.";
    }
}
