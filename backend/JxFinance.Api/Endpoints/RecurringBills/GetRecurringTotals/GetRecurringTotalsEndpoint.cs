using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringTotals;

public sealed class GetRecurringTotalsEndpoint(IRecurringBillScheduleService schedule)
    : EndpointWithoutRequest<RecurringTotalsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills + "/totals");
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await schedule.GetTotalsAsync(ct), ct);
}
