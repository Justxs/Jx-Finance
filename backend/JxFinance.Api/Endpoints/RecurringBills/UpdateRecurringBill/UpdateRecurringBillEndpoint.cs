using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<UpdateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Put("/api/recurring-bills/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateRecurringBillRequest req, CancellationToken ct)
    {
        var result = await recurringBillService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
