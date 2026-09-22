using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBills;

public sealed class GetRecurringBillsEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<IReadOnlyList<RecurringBillResponse>, RecurringBillMapper>
{
    public override void Configure()
    {
        Get(ApiRoutes.RecurringBills);
        Group<RecurringBillsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bills = await recurringBillService.GetAllAsync(ct);
        await Send.OkAsync(bills.Select(Map.FromEntity).ToList(), ct);
    }
}
