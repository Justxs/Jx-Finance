using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<ConfirmRecurringBillRequest, ConfirmRecurringBillResponse, RecurringBillMapper>
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
        await Send.OkAsync(
            new ConfirmRecurringBillResponse(
                Map.FromEntity(confirmation.Bill),
                confirmation.TransactionId,
                confirmation.TransferId),
            ct);
    }
}
