using FastEndpoints;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringBills;

public sealed class GetRecurringBillsEndpoint(IRecurringBillService recurringBillService)
    : EndpointWithoutRequest<IReadOnlyList<RecurringBillResponse>>
{
    public override void Configure()
    {
        Get("/api/recurring-bills");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bills = await recurringBillService.GetAllAsync(ct);
        await Send.OkAsync(bills, ct);
    }
}
