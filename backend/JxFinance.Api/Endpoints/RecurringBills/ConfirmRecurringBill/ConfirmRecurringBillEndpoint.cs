using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<ConfirmRecurringBillRequest, ConfirmRecurringBillResponse>
{
    public override void Configure()
    {
        Post("/api/recurring-bills/{id}/confirm");
        Description(d => d.ProducesProblemDetails(400).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ConfirmRecurringBillRequest req, CancellationToken ct)
    {
        var result = await recurringBillService.ConfirmAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
