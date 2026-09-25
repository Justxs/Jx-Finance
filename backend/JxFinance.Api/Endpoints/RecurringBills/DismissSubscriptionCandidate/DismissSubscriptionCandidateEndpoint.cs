using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;

public sealed class DismissSubscriptionCandidateEndpoint(ISubscriptionDetectionService detection)
    : Endpoint<DismissSubscriptionCandidateRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills + "/suggestions/dismiss");
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(DismissSubscriptionCandidateRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await detection.DismissAsync(req, ct), ct);
}
