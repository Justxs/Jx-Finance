using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillEndpoint(IRecurringBillService recurringBillService)
    : Endpoint<UpdateRecurringBillRequest, RecurringBillResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.RecurringBills + "/{id}");
        Group<RecurringBillsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateRecurringBillRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await recurringBillService.UpdateAsync(req, ct), ct);
    }
}
