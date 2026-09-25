using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBills;

public sealed class GetRecurringBillsEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<IReadOnlyList<RecurringBillResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills);
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await recurringBillService.GetAllAsync(ct), ct);
}
