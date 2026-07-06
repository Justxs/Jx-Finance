using FastEndpoints;
using JxFinance.Endpoints.RecurringBills.GetRecurringBill;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<CreateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Post("/api/recurring-bills");
    }

    public override async Task HandleAsync(CreateRecurringBillRequest req, CancellationToken ct)
    {
        var bill = await recurringBillService.CreateAsync(req, ct);
        await Send.CreatedAtAsync<GetRecurringBillEndpoint>(new { id = bill.Id }, bill, cancellation: ct);
    }
}
