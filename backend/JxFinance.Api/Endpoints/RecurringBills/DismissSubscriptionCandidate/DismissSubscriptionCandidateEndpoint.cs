using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.DismissSubscriptionCandidate;

public sealed class DismissSubscriptionCandidateEndpoint(ISubscriptionDetectionService detection)
    : Endpoint<DismissSubscriptionCandidateRequest>
{
    public override void Configure()
    {
        Post("recurring-bills/suggestions/dismiss");
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(DismissSubscriptionCandidateRequest req, CancellationToken ct)
    {
        (await detection.DismissAsync(req, ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
