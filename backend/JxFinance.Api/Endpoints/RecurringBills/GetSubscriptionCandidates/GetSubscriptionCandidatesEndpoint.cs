using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.GetSubscriptionCandidates;

public sealed class GetSubscriptionCandidatesEndpoint(ISubscriptionDetectionService detection)
    : EndpointWithoutRequest<IReadOnlyList<SubscriptionCandidateResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills + "/suggestions");
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await detection.DetectAsync(ct), ct);
}
