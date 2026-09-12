using FastEndpoints;
using JxFinance.Common.Errors;
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
        var result = await recurringBillService.CreateAsync(req, ct);
        if (result.IsFailure) { await Send.ResultAsync(result.ToProblemResult()); return; }
        var bill = result.Value!;
        await Send.CreatedAtAsync<GetRecurringBillEndpoint>(new { id = bill.Id }, bill, cancellation: ct);
    }
}
