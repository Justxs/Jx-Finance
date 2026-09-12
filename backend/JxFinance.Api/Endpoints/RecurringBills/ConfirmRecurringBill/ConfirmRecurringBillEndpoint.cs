using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<ConfirmRecurringBillRequest, ConfirmRecurringBillResponse>
{
    public override void Configure()
    {
        Post("recurring-bills/{id}/confirm");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ConfirmRecurringBillRequest req, CancellationToken ct)
    {
        var confirmation = (await recurringBillService.ConfirmAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(confirmation, ct);
    }
}
