using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<UpdateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Put("recurring-bills/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateRecurringBillRequest req, CancellationToken ct)
    {
        var bill = (await recurringBillService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(bill, ct);
    }
}
