using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;

namespace JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;

public sealed class ConfirmRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<ConfirmRecurringBillRequest, ConfirmRecurringBillResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.RecurringBills + "/{id}/confirm");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(ConfirmRecurringBillRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await recurringBillService.ConfirmAsync(req, ct), ct);
    }
}
